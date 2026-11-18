import { useEffect, useState } from 'react'
import { Lobby } from './components/Lobby'
import { PokerRoom } from './components/PokerRoom'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  revealCards,
  selectCard,
  startNewRound,
  subscribeToRoom,
} from './services/roomService'
import type { CardValue, Room } from './types'
import { getOrCreateUserId, getSavedUserName, saveUserName } from './utils/session'

function getUrlRoomCode(): string {
  const params = new URLSearchParams(window.location.search)
  return (params.get('room') || '').trim().toUpperCase()
}

function setUrlRoomCode(roomCode: string | null): void {
  const url = new URL(window.location.href)
  if (roomCode) {
    url.searchParams.set('room', roomCode)
  } else {
    url.searchParams.delete('room')
  }
  window.history.replaceState({}, '', url.toString())
}

export default function App() {
  const [userId] = useState<string>(() => getOrCreateUserId())
  const [userName, setUserName] = useState<string>(() => getSavedUserName())
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const initialUrlRoomCode = getUrlRoomCode()

  // Subscribe to real-time updates whenever activeRoomId is set
  useEffect(() => {
    if (!activeRoomId) {
      setRoom(null)
      return
    }

    const unsubscribe = subscribeToRoom(
      activeRoomId,
      (updatedRoom) => {
        if (!updatedRoom) {
          setError(`Room "${activeRoomId}" no longer exists.`)
          setActiveRoomId(null)
          setRoom(null)
          setUrlRoomCode(null)
          return
        }
        setRoom(updatedRoom)
      },
      (err) => {
        setError(err.message || 'Lost connection to room.')
      }
    )

    return () => {
      unsubscribe()
    }
  }, [activeRoomId])

  const handleCreateRoom = async (roomName: string, displayName: string) => {
    setLoading(true)
    setError(null)
    try {
      saveUserName(displayName)
      setUserName(displayName)
      const created = await createRoom(roomName, userId, displayName)
      setRoom(created)
      setActiveRoomId(created.id)
      setUrlRoomCode(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (roomCode: string, displayName: string) => {
    setLoading(true)
    setError(null)
    try {
      saveUserName(displayName)
      setUserName(displayName)
      const joined = await joinRoom(roomCode, userId, displayName)
      setRoom(joined)
      setActiveRoomId(joined.id)
      setUrlRoomCode(joined.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCard = async (vote: CardValue | null) => {
    if (!activeRoomId) return
    await selectCard(activeRoomId, userId, vote)
  }

  const handleRevealCards = async () => {
    if (!activeRoomId) return
    await revealCards(activeRoomId)
  }

  const handleNewRound = async () => {
    if (!activeRoomId || !room) return
    await startNewRound(activeRoomId, room)
  }

  const handleLeaveRoom = async () => {
    if (activeRoomId) {
      await leaveRoom(activeRoomId, userId)
    }
    setActiveRoomId(null)
    setRoom(null)
    setUrlRoomCode(null)
  }

  if (activeRoomId && room) {
    return (
      <PokerRoom
        room={room}
        currentUserId={userId}
        onSelectCard={handleSelectCard}
        onRevealCards={handleRevealCards}
        onNewRound={handleNewRound}
        onLeaveRoom={handleLeaveRoom}
      />
    )
  }

  return (
    <Lobby
      initialRoomCode={initialUrlRoomCode}
      initialUserName={userName}
      error={error}
      loading={loading}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
    />
  )
}
