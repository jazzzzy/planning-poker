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

// ─── Local Fallback Helpers (for instant local multi-tab testing before .env is set) ───

function getLocalRoom(roomId: string): Room | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${roomId}`)
    return raw ? (JSON.parse(raw) as Room) : null
  } catch {
    return null
  }
}

function saveLocalRoom(room: Room): void {
  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${room.id}`, JSON.stringify(room))
  broadcastChannel?.postMessage({ type: 'ROOM_UPDATED', roomId: room.id, room })
  window.dispatchEvent(
    new CustomEvent('local-room-update', { detail: { roomId: room.id, room } })
  )
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
    saveLocalRoom(room)
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

    const participant: Participant = {
      id: userId,
      name: trimmedName,
      vote: existing ? existing.vote : null,
      joinedAt: existing ? existing.joinedAt : Date.now(),
    }

    await updateDoc(roomRef, {
      [`participants.${userId}`]: participant,
    })

    return {
      ...roomData,
      participants: {
        ...roomData.participants,
        [userId]: participant,
      },
    }
  } else {
    const existingRoom = getLocalRoom(normalizedCode)
    if (!existingRoom) {
      throw new Error(`Room "${normalizedCode}" was not found. Check the code or create a new room.`)
    }

    const existingParticipant = existingRoom.participants[userId]
    const participant: Participant = {
      id: userId,
      name: trimmedName,
      vote: existingParticipant ? existingParticipant.vote : null,
      joinedAt: existingParticipant ? existingParticipant.joinedAt : Date.now(),
    }

    const updated: Room = {
      ...existingRoom,
      participants: {
        ...existingRoom.participants,
        [userId]: participant,
      },
    }
    saveLocalRoom(updated)
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
    // Initial emit
    onUpdate(getLocalRoom(normalizedCode))

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'ROOM_UPDATED' && event.data?.roomId === normalizedCode) {
        onUpdate(event.data.room as Room)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === `${LOCAL_STORAGE_PREFIX}${normalizedCode}`) {
        onUpdate(getLocalRoom(normalizedCode))
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
    const room = getLocalRoom(normalizedCode)
    if (!room || !room.participants[userId]) return
    room.participants[userId] = {
      ...room.participants[userId],
      vote,
    }
    saveLocalRoom(room)
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
    const room = getLocalRoom(normalizedCode)
    if (!room) return
    room.revealed = true
    saveLocalRoom(room)
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
    const room = getLocalRoom(normalizedCode)
    if (!room) return
    const resetParticipants: Record<string, Participant> = {}
    for (const [pid, p] of Object.entries(room.participants)) {
      resetParticipants[pid] = { ...p, vote: null }
    }
    room.revealed = false
    room.round = (room.round || 1) + 1
    room.participants = resetParticipants
    saveLocalRoom(room)
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
    const room = getLocalRoom(normalizedCode)
    if (!room) return
    delete room.participants[userId]
    saveLocalRoom(room)
  }
}
