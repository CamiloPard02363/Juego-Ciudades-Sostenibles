import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { SnakesLaddersChallengeResult, SnakesLaddersRoomStateView } from './snakesLaddersTypes'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

/**
 * Conexión de socket para una sala de Escaleras y Serpientes en tiempo real
 * — mismo patrón que useDominoRoom (un socket por montaje, namespace
 * compartido /rooms, eventos prefijados `snakes-ladders:`). A diferencia de
 * useDominoRoom, escucha `room:error` (no `snakes-ladders:error`): el
 * WsExceptionFilter del servidor siempre emite ese único nombre de evento
 * para cualquier tipo de sala, sin importar el prefijo de sus mensajes.
 */
export function useSnakesLaddersRoom(token: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [room, setRoom] = useState<SnakesLaddersRoomStateView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [rematchRejectedMessage, setRematchRejectedMessage] = useState<string | null>(null)
  const [lastChallengeResult, setLastChallengeResult] = useState<SnakesLaddersChallengeResult | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io(`${API_URL}/rooms`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnecting(false))
    socket.on('disconnect', () => setConnecting(true))
    socket.on('snakes-ladders:state', (state: SnakesLaddersRoomStateView) => {
      setRoom(state)
      setError(null)
    })
    socket.on('room:error', (payload: { message: string }) => setError(payload.message))
    socket.on('snakes-ladders:challenge-result', (payload: SnakesLaddersChallengeResult) => {
      setLastChallengeResult(payload)
    })
    socket.on('snakes-ladders:rematch-rejected', (payload: { message: string }) => {
      setRematchRejectedMessage(payload.message)
      setRoom(null)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const createRoom = useCallback((gameId: string) => {
    socketRef.current?.emit('snakes-ladders:create', { gameId })
  }, [])

  const joinRoom = useCallback((code: string) => {
    socketRef.current?.emit('snakes-ladders:join', { code })
  }, [])

  const startGame = useCallback((turnDurationSeconds?: number) => {
    socketRef.current?.emit('snakes-ladders:start', { turnDurationSeconds })
  }, [])

  const rollDice = useCallback(() => {
    socketRef.current?.emit('snakes-ladders:roll-dice')
  }, [])

  const answerChallenge = useCallback((optionIndex: number) => {
    socketRef.current?.emit('snakes-ladders:answer-challenge', { optionIndex })
  }, [])

  const voteRematch = useCallback((accept: boolean) => {
    socketRef.current?.emit('snakes-ladders:rematch-vote', { accept })
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('snakes-ladders:leave')
    setRoom(null)
  }, [])

  return {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    lastChallengeResult,
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    answerChallenge,
    voteRematch,
    leaveRoom,
  }
}
