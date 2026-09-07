import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { TournamentPairingAnnouncement, TournamentStateView } from './guessWhoTypes'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

/**
 * Conexión de socket para el modo grupo (torneo eliminatorio) de "¿Quién
 * Es?". Espeja el patrón de useGuessWhoRoom (un socket por montaje), pero
 * habla los eventos `tournament:*` en vez de `room:*` — el servidor los
 * mantiene separados para no chocar con las salas 1v1 sueltas.
 */
export function useGuessWhoTournament(token: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [tournament, setTournament] = useState<TournamentStateView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [pairingAnnouncement, setPairingAnnouncement] = useState<TournamentPairingAnnouncement | null>(null)
  const [matchAccusationFailedMessage, setMatchAccusationFailedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const socket = io(`${API_URL}/rooms`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnecting(false))
    socket.on('disconnect', () => setConnecting(true))
    socket.on('tournament:state', (state: TournamentStateView) => {
      setTournament(state)
      setError(null)
    })
    socket.on('room:error', (payload: { message: string }) => setError(payload.message))
    // Anuncio de emparejamiento al arrancar una ronda: se muestra brevemente
    // "Tu compañero es: [nombre]" antes de que el match arranque de lleno.
    socket.on('tournament:pairing-announced', (payload: TournamentPairingAnnouncement) => {
      setPairingAnnouncement(payload)
    })
    socket.on(
      'tournament:match-accusation-result',
      (payload: { matchCode: string; accuserUserId: string; correct: boolean }) => {
        if (payload.correct) return
        setMatchAccusationFailedMessage('Acusación fallida. El match continúa.')
      },
    )

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const createTournament = useCallback((gameId: string, maxParticipants: number) => {
    socketRef.current?.emit('tournament:create', { gameId, maxParticipants })
  }, [])

  const joinTournament = useCallback((code: string) => {
    socketRef.current?.emit('tournament:join', { code })
  }, [])

  const startTournament = useCallback(() => {
    socketRef.current?.emit('tournament:start')
  }, [])

  const leaveTournament = useCallback(() => {
    socketRef.current?.emit('tournament:leave')
    setTournament(null)
  }, [])

  const discardMatchCard = useCallback((cardId: string) => {
    socketRef.current?.emit('tournament:match-discard', { cardId })
  }, [])

  const accuseMatchCard = useCallback((cardId: string) => {
    socketRef.current?.emit('tournament:match-accuse', { cardId })
  }, [])

  const passMatchTurn = useCallback(() => {
    socketRef.current?.emit('tournament:match-pass-turn')
  }, [])

  return {
    tournament,
    error,
    connecting,
    pairingAnnouncement,
    clearPairingAnnouncement: () => setPairingAnnouncement(null),
    matchAccusationFailedMessage,
    clearMatchAccusationFailedMessage: () => setMatchAccusationFailedMessage(null),
    createTournament,
    joinTournament,
    startTournament,
    leaveTournament,
    discardMatchCard,
    accuseMatchCard,
    passMatchTurn,
  }
}
