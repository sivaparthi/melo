import { useEffect, useRef, useState } from 'react'
import type { ClientToServerEvents, EmotionId, Participant, ServerToClientEvents } from '@emote/contracts'
import { io, type Socket } from 'socket.io-client'
import { API_URL } from '../../lib/api'

type SessionSocket = Socket<ServerToClientEvents, ClientToServerEvents>
type ConnectionState = 'connecting' | 'connected' | 'offline'

export function useSessionSocket(roomId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<SessionSocket | null>(null)

  useEffect(() => {
    if (!roomId) return
    const nextSocket: SessionSocket = io(API_URL, {
      transports: ['websocket'],
      withCredentials: true,
    })
    socketRef.current = nextSocket
    nextSocket.on('connect', () => {
      setConnectionState('connected')
      nextSocket.emit('room:join', { roomId }, (result) => {
        if (result.ok === false) setError(result.error)
      })
    })
    nextSocket.on('disconnect', () => setConnectionState('offline'))
    nextSocket.on('connect_error', () => { setConnectionState('offline'); setError('The live room is unavailable. Retrying...') })
    nextSocket.on('room:snapshot', (snapshot) => { setParticipants(snapshot.participants); setError(null) })
    return () => { nextSocket.disconnect(); socketRef.current = null }
  }, [roomId])

  function setEmotion(emotion: EmotionId) {
    const socket = socketRef.current
    if (!socket?.connected) { setError('Reconnect before sharing an emotion.'); return }
    if (!roomId) return
    socket.emit('emotion:set', { roomId, emotion }, (result) => {
      if (result.ok === false) setError(result.error)
    })
  }
  return {
    participants: roomId ? participants : [],
    connectionState: roomId ? connectionState : 'offline',
    error: roomId ? error : null,
    setEmotion,
  }
}