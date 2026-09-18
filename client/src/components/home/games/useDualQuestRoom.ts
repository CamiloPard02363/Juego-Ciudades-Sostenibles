import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  DualQuestAssemblyResult,
  DualQuestDirection,
  DualQuestRole,
  DualQuestRoomStateView,
  DualQuestTriggerResult,
} from './dualQuestTypes'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

/**
 * Conexión de socket para una sala de Dúo Lógico — mismo patrón que
 * useSnakesLaddersRoom (un socket por montaje, namespace /rooms, escucha
 * `room:error` — el único evento de error que el servidor realmente emite,
 * ver la lección aprendida con el bug de useDominoRoom). La diferencia real
 * es que `move` no es una acción puntual: se manda cada vez que cambia la
 * dirección deseada (tecla presionada/soltada), no una vez por turno.
 */
export function useDualQuestRoom(token: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const waitingCodeRef = useRef<string | null>(null)
  const [room, setRoom] = useState<DualQuestRoomStateView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [lastTriggerResult, setLastTriggerResult] = useState<DualQuestTriggerResult | null>(null)
  const [lastAssemblyResult, setLastAssemblyResult] = useState<DualQuestAssemblyResult | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io(`${API_URL}/rooms`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnecting(false)
      // Reingresar al lobby tras reconectar; el servidor exige confirmar de nuevo.
      if (waitingCodeRef.current) socket.emit('dual-quest:join', { code: waitingCodeRef.current })
    })
    socket.on('disconnect', () => setConnecting(true))
    socket.on('dual-quest:state', (state: DualQuestRoomStateView) => {
      waitingCodeRef.current = state.phase === 'WAITING' ? state.code : null
      setRoom(state)
      setError(null)
    })
    socket.on('room:error', (payload: { message: string }) => setError(payload.message))
    socket.on('dual-quest:trigger-result', (payload: DualQuestTriggerResult) => setLastTriggerResult(payload))
    socket.on('dual-quest:assembly-result', (payload: DualQuestAssemblyResult) => setLastAssemblyResult(payload))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const createRoom = useCallback((gameId: string, role: DualQuestRole) => {
    socketRef.current?.emit('dual-quest:create', { gameId, role })
  }, [])

  const joinRoom = useCallback((code: string) => {
    waitingCodeRef.current = code
    if (socketRef.current?.connected) socketRef.current.emit('dual-quest:join', { code })
  }, [])

  const setReady = useCallback((ready: boolean) => {
    if (socketRef.current?.connected) socketRef.current.emit('dual-quest:ready', { ready })
  }, [])
  const move = useCallback((direction: DualQuestDirection | null) => {
    socketRef.current?.emit('dual-quest:move', { direction })
  }, [])

  const activateTrigger = useCallback((triggerId: string) => {
    socketRef.current?.emit('dual-quest:activate-trigger', { triggerId })
  }, [])

  const answerTrigger = useCallback((triggerId: string, optionIndex: number) => {
    socketRef.current?.emit('dual-quest:answer-trigger', { triggerId, optionIndex })
  }, [])

  const submitAssembly = useCallback((orderedGemIds: string[]) => {
    socketRef.current?.emit('dual-quest:submit-assembly', { orderedGemIds })
  }, [])

  const restart = useCallback(() => {
    socketRef.current?.emit('dual-quest:restart')
  }, [])

  const leaveRoom = useCallback(() => {
    waitingCodeRef.current = null
    socketRef.current?.emit('dual-quest:leave')
    setRoom(null)
  }, [])

  return {
    room,
    error,
    connecting,
    lastTriggerResult,
    lastAssemblyResult,
    createRoom,
    joinRoom,
    setReady,
    move,
    activateTrigger,
    answerTrigger,
    submitAssembly,
    restart,
    leaveRoom,
  }
}
