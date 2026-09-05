import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { RoomStateView } from './guessWhoTypes'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

/**
 * Conexión de socket para una sala de "¿Quién Es?". Un solo socket por
 * montaje del hook: se crea al entrar a la pantalla de sala y se cierra al
 * salir, así que no hace falta reconectar entre create/join/start/discard.
 */
export function useGuessWhoRoom(token: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [room, setRoom] = useState<RoomStateView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [rematchRejectedMessage, setRematchRejectedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io(`${API_URL}/rooms`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnecting(false))
    socket.on('disconnect', () => setConnecting(true))
    socket.on('room:state', (state: RoomStateView) => {
      setRoom(state)
      setError(null)
    })
    socket.on('room:error', (payload: { message: string }) => setError(payload.message))
    // El rival votó "no" a la revancha: el servidor ya cerró la sala, así
    // que aquí solo mostramos el aviso y limpiamos el estado local.
    socket.on('room:rematch-rejected', (payload: { message: string }) => {
      setRematchRejectedMessage(payload.message)
      setRoom(null)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const createRoom = useCallback((gameId: string) => {
    socketRef.current?.emit('room:create', { gameId })
  }, [])

  const joinRoom = useCallback((code: string) => {
    socketRef.current?.emit('room:join', { code })
  }, [])

  const startGame = useCallback(() => {
    socketRef.current?.emit('room:start')
  }, [])

  const discardCard = useCallback((cardId: string) => {
    socketRef.current?.emit('room:discard', { cardId })
  }, [])

  const accuseCard = useCallback((cardId: string) => {
    socketRef.current?.emit('room:accuse', { cardId })
  }, [])

  const voteRematch = useCallback((accept: boolean) => {
    socketRef.current?.emit('room:rematch-vote', { accept })
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave')
    setRoom(null)
  }, [])

  return {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    createRoom,
    joinRoom,
    startGame,
    discardCard,
    accuseCard,
    voteRematch,
    leaveRoom,
  }
}
