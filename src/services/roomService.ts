import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteField,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebase'
import type { CardValue, Participant, Room } from '../types'

const LOCAL_STORAGE_PREFIX = 'scrum_poker_room_'
const CHANNEL_NAME = 'scrum_poker_sync_channel'

const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null

/**
 * Generates a clean 6-character uppercase room code (excluding ambiguous characters like 0/O, 1/I).
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint32Array(6)
  crypto.getRandomValues(array)
  return Array.from(array, (n) => chars[n % chars.length]).join('')
}

// ─── Local & Dev-Server Sync Helpers (works across different browsers + tabs) ───

function getCachedLocalRoom(roomId: string): Room | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${roomId}`)
    return raw ? (JSON.parse(raw) as Room) : null
  } catch {
    return null
  }
}

async function fetchLocalRoom(roomId: string): Promise<Room | null> {
  try {
    const res = await fetch(`/__dev_rooms/${roomId}`)
    if (res.ok) {
      const data = (await res.json()) as { room: Room | null }
      if (data.room) {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${roomId}`, JSON.stringify(data.room))
        return data.room
      }
    }
  } catch {
    // Fallback to localStorage if dev server endpoint is not reachable
  }

  // Fallback: if localStorage has it, push it up to the dev server so other browsers can see it
  const cached = getCachedLocalRoom(roomId)
  if (cached) {
    try {
      await fetch(`/__dev_rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: cached }),
      })
    } catch {
      // ignore
    }
  }
  return cached
}

async function saveLocalRoom(room: Room): Promise<void> {
  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${room.id}`, JSON.stringify(room))
  broadcastChannel?.postMessage({ type: 'ROOM_UPDATED', roomId: room.id, room })
  window.dispatchEvent(
    new CustomEvent('local-room-update', { detail: { roomId: room.id, room } })
  )
  try {
    await fetch(`/__dev_rooms/${room.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room }),
    })
  } catch {
    // ignore if offline
  }
}

// ─── Public Room Service API ──────────────────────────────────────────────────────────

export async function createRoom(
  roomName: string,
  ownerId: string,
  ownerName: string
): Promise<Room> {
  const roomId = generateRoomCode()
  const now = Date.now()
  const ownerParticipant: Participant = {
    id: ownerId,
    name: ownerName.trim(),
    vote: null,
    joinedAt: now,
  }

  const room: Room = {
    id: roomId,
    name: roomName.trim() || `Sprint Planning`,
    ownerId,
    ownerName: ownerName.trim(),
    revealed: false,
    round: 1,
    createdAt: now,
    participants: {
      [ownerId]: ownerParticipant,
    },
  }

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', roomId)
    await setDoc(roomRef, room)
  } else {
    await saveLocalRoom(room)
  }

  return room
}

export async function joinRoom(
  roomId: string,
  userId: string,
  userName: string
): Promise<Room> {
  const normalizedCode = roomId.trim().toUpperCase()
  const trimmedName = userName.trim()

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', normalizedCode)
    const snap = await getDoc(roomRef)

    if (!snap.exists()) {
      throw new Error(`Room "${normalizedCode}" was not found. Check the code or create a new room.`)
    }

    const roomData = snap.data() as Room
    const existing = roomData.participants?.[userId]

    // Find any stale duplicate entry with the exact same display name (case-insensitive)
    // from a previous tab/session so the user never appears twice in the room.
    const duplicateEntry = Object.values(roomData.participants || {}).find(
      (p) => p.id !== userId && p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )

    const previousRecord = existing || duplicateEntry

    const participant: Participant = {
      id: userId,
      name: trimmedName,
      vote: previousRecord ? previousRecord.vote : null,
      joinedAt: previousRecord ? previousRecord.joinedAt : Date.now(),
    }

    const updates: Record<string, unknown> = {
      [`participants.${userId}`]: participant,
    }

    if (duplicateEntry) {
      updates[`participants.${duplicateEntry.id}`] = deleteField()
      // If the duplicate entry was the room owner, transfer ownership to the returning user's current ID
      if (roomData.ownerId === duplicateEntry.id) {
        updates.ownerId = userId
      }
    }

    await updateDoc(roomRef, updates)

    const updatedParticipants = { ...roomData.participants }
    if (duplicateEntry) {
      delete updatedParticipants[duplicateEntry.id]
    }
    updatedParticipants[userId] = participant

    return {
      ...roomData,
      ownerId:
        duplicateEntry && roomData.ownerId === duplicateEntry.id
          ? userId
          : roomData.ownerId,
      participants: updatedParticipants,
    }
  } else {
    const existingRoom = await fetchLocalRoom(normalizedCode)
    if (!existingRoom) {
      throw new Error(`Room "${normalizedCode}" was not found. Check the code or create a new room.`)
    }

    const existingParticipant = existingRoom.participants[userId]
    const duplicateEntry = Object.values(existingRoom.participants || {}).find(
      (p) => p.id !== userId && p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
    const previousRecord = existingParticipant || duplicateEntry

    const participant: Participant = {
      id: userId,
      name: trimmedName,
      vote: previousRecord ? previousRecord.vote : null,
      joinedAt: previousRecord ? previousRecord.joinedAt : Date.now(),
    }

    const updatedParticipants = { ...existingRoom.participants }
    if (duplicateEntry) {
      delete updatedParticipants[duplicateEntry.id]
    }
    updatedParticipants[userId] = participant

    const updated: Room = {
      ...existingRoom,
      ownerId:
        duplicateEntry && existingRoom.ownerId === duplicateEntry.id
          ? userId
          : existingRoom.ownerId,
      participants: updatedParticipants,
    }
    await saveLocalRoom(updated)
    return updated
  }
}

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: Room | null) => void,
  onError?: (err: Error) => void
): () => void {
  const normalizedCode = roomId.trim().toUpperCase()

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', normalizedCode)
    return onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as Room)
        } else {
          onUpdate(null)
        }
      },
      (err) => {
        onError?.(err)
      }
    )
  } else {
    // 1. Emit initial room state from dev server (or local cache)
    void fetchLocalRoom(normalizedCode).then((room) => {
      if (room) onUpdate(room)
    })

    // 2. Listen to Server-Sent Events (SSE) for real-time cross-browser updates
    let eventSource: EventSource | null = null
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/__dev_rooms/events')
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { roomId: string; room: Room }
          if (data.roomId === normalizedCode && data.room) {
            localStorage.setItem(
              `${LOCAL_STORAGE_PREFIX}${normalizedCode}`,
              JSON.stringify(data.room)
            )
            onUpdate(data.room)
          }
        } catch {
          // ignore malformed event
        }
      }
    }

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'ROOM_UPDATED' && event.data?.roomId === normalizedCode) {
        onUpdate(event.data.room as Room)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === `${LOCAL_STORAGE_PREFIX}${normalizedCode}`) {
        onUpdate(getCachedLocalRoom(normalizedCode))
      }
    }

    const handleCustom = (event: Event) => {
      const customEvent = event as CustomEvent<{ roomId: string; room: Room }>
      if (customEvent.detail?.roomId === normalizedCode) {
        onUpdate(customEvent.detail.room)
      }
    }

    broadcastChannel?.addEventListener('message', handleBroadcast)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('local-room-update', handleCustom)

    return () => {
      eventSource?.close()
      broadcastChannel?.removeEventListener('message', handleBroadcast)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('local-room-update', handleCustom)
    }
  }
}

export async function selectCard(
  roomId: string,
  userId: string,
  vote: CardValue | null
): Promise<void> {
  const normalizedCode = roomId.trim().toUpperCase()

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', normalizedCode)
    await updateDoc(roomRef, {
      [`participants.${userId}.vote`]: vote,
    })
  } else {
    const room = await fetchLocalRoom(normalizedCode)
    if (!room || !room.participants[userId]) return
    room.participants[userId] = {
      ...room.participants[userId],
      vote,
    }
    await saveLocalRoom(room)
  }
}

export async function revealCards(roomId: string): Promise<void> {
  const normalizedCode = roomId.trim().toUpperCase()

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', normalizedCode)
    await updateDoc(roomRef, {
      revealed: true,
    })
  } else {
    const room = await fetchLocalRoom(normalizedCode)
    if (!room) return
    room.revealed = true
    await saveLocalRoom(room)
  }
}

export async function startNewRound(roomId: string, currentRoom: Room): Promise<void> {
  const normalizedCode = roomId.trim().toUpperCase()

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', normalizedCode)
    const updates: Record<string, unknown> = {
      revealed: false,
      round: (currentRoom.round || 1) + 1,
    }
    for (const pid of Object.keys(currentRoom.participants)) {
      updates[`participants.${pid}.vote`] = null
    }
    await updateDoc(roomRef, updates)
  } else {
    const room = await fetchLocalRoom(normalizedCode)
    if (!room) return
    const resetParticipants: Record<string, Participant> = {}
    for (const [pid, p] of Object.entries(room.participants)) {
      resetParticipants[pid] = { ...p, vote: null }
    }
    room.revealed = false
    room.round = (room.round || 1) + 1
    room.participants = resetParticipants
    await saveLocalRoom(room)
  }
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const normalizedCode = roomId.trim().toUpperCase()

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, 'rooms', normalizedCode)
    try {
      await updateDoc(roomRef, {
        [`participants.${userId}`]: deleteField(),
      })
    } catch {
      // Ignore if room doesn't exist
    }
  } else {
    const room = await fetchLocalRoom(normalizedCode)
    if (!room) return
    delete room.participants[userId]
    await saveLocalRoom(room)
  }
}
