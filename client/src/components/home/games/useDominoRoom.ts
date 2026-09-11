import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { DominoRoomStateView } from './dominoRoomTypes'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

/**
 * Conexión de socket para una sala de Dominó en tiempo real — mismo patrón
 * que useGuessWhoRoom (un socket por montaje, namespace compartido /rooms,
 * eventos prefijados `domino:` para no chocar con las salas de "¿Quién Es?").
 */
export function useDominoRoom(token: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [room, setRoom] = useState<DominoRoomStateView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [rematchRejectedMessage, setRematchRejectedMessage] = useState<string | null>(null)
  const [dealCountdownMs, setDealCountdownMs] = useState<number | null>(null)
  /** Ficha jugada en el último room:state recibido (para animar "quién jugó" en el tablero). */
  const [lastPlacedTileId, setLastPlacedTileId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io(`${API_URL}/rooms`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnecting(false))
    socket.on('disconnect', () => setConnecting(true))
    socket.on('domino:state', (state: DominoRoomStateView) => {
      setRoom((previous) => {
        const previousBoardIds = new Set((previous?.board ?? []).map((tile) => tile.id))
        const newlyPlaced = state.board.find((tile) => !previousBoardIds.has(tile.id))
        setLastPlacedTileId(newlyPlaced?.id ?? null)
        return state
      })
      setError(null)
      setDealCountdownMs(null)
    })
    socket.on('domino:error', (payload: { message: string }) => setError(payload.message))
    socket.on('domino:dealing', (payload: { countdownMs: number }) => {
      setDealCountdownMs(payload.countdownMs)
    })
    socket.on('domino:rematch-rejected', (payload: { message: string }) => {
      setRematchRejectedMessage(payload.message)
      setRoom(null)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const createRoom = useCallback((gameId: string) => {
    socketRef.current?.emit('domino:create', { gameId })
  }, [])

  const joinRoom = useCallback((code: string) => {
    socketRef.current?.emit('domino:join', { code })
  }, [])

  const startGame = useCallback((turnDurationSeconds?: number) => {
    socketRef.current?.emit('domino:start', { turnDurationSeconds })
  }, [])

  const updateTurnDuration = useCallback((turnDurationSeconds: number) => {
    socketRef.current?.emit('domino:update-turn-duration', { turnDurationSeconds })
  }, [])

  const playTile = useCallback((tileId: string, side: 'left' | 'right') => {
    socketRef.current?.emit('domino:play', { tileId, side })
  }, [])

  const drawTile = useCallback(() => {
    socketRef.current?.emit('domino:draw')
  }, [])

  const passTurn = useCallback(() => {
    socketRef.current?.emit('domino:pass')
  }, [])

  const voteRematch = useCallback((accept: boolean) => {
    socketRef.current?.emit('domino:rematch-vote', { accept })
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('domino:leave')
    setRoom(null)
  }, [])

  return {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    dealCountdownMs,
    lastPlacedTileId,
    createRoom,
    joinRoom,
    startGame,
    updateTurnDuration,
    playTile,
    drawTile,
    passTurn,
    voteRematch,
    leaveRoom,
  }
}
