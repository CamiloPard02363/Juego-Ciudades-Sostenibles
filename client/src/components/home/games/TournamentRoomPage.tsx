import { GameInstructionsGate } from './GameInstructionsGate'
import { ChatPanel } from './ChatPanel'
import { MultiplayerLobby } from './MultiplayerLobby'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Crown, LogOut, Skull, Trophy, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoTournament } from './useGuessWhoTournament'
import { Modal } from './Modal'
import { MatchBoard } from './MatchBoard'
import { MIN_DISCARDS_TO_ACCUSE } from './guessWhoTypes'

/** Debe coincidir con TOURNAMENT_MAX_PARTICIPANTS del gateway. */
const MAX_PARTICIPANTS_LIMIT = 10
const MIN_PARTICIPANTS_LIMIT = 2

/**
 * Sala de torneo eliminatorio ("¿Quién Es?" grupal) en página propia (ruta
 * `/quien-es/torneo/:code?`, ver App.tsx), mismo criterio que
 * GuessWhoRoomPage/DominoRoomPage: reconecta al torneo en curso vía el
 * código en la URL, y no deja el Sidebar/header de HomeLayout montado detrás.
 */
export function TournamentRoomPage() {
  return <GameInstructionsGate kind={'GUESS_WHO_GROUP'}><TournamentSession /></GameInstructionsGate>
}

function TournamentSession() {
  const { code: codeFromUrl } = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()
  const gameIdToCreate = searchParams.get('gameId')
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const {
    tournament,
    error,
    connecting,
    pairingAnnouncement,
    clearPairingAnnouncement,
    matchAccusationFailedMessage,
    clearMatchAccusationFailedMessage,
    createTournament,
    joinTournament,
    setReady,
    messages,
    sendChatMessage,
    sendMatchMessage,
    askQuestion,
    answerQuestion,
    updateTurnDuration,
    leaveTournament,
    discardMatchCard,
    accuseMatchCard,
    passMatchTurn,
  } = useGuessWhoTournament(token, user?.id)

  const startedRef = useRef(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [maxParticipantsText, setMaxParticipantsText] = useState('4')
  const [maxParticipantsWarning, setMaxParticipantsWarning] = useState<string | null>(null)
  const [showPairingOverlay, setShowPairingOverlay] = useState(false)

  // Arranque de la sala: si la URL trae un código en el path, se une a esa
  // sala — mismo patrón de reconexión que Dominó/Escaleras/GuessWho.
  useEffect(() => {
    if (connecting || startedRef.current) return
    if (codeFromUrl) {
      startedRef.current = true
      joinTournament(codeFromUrl.toUpperCase())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, codeFromUrl])

  useEffect(() => {
    if (tournament && !codeFromUrl) {
      navigate(`/quien-es/torneo/${tournament.code}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.code])

  useEffect(() => {
    if (!pairingAnnouncement) return
    setShowPairingOverlay(true)
    const timeout = setTimeout(() => {
      setShowPairingOverlay(false)
      clearPairingAnnouncement()
    }, 2800)
    return () => clearTimeout(timeout)
  }, [pairingAnnouncement, clearPairingAnnouncement])

  useEffect(() => {
    if (!matchAccusationFailedMessage) return
    const timeout = setTimeout(clearMatchAccusationFailedMessage, 3500)
    return () => clearTimeout(timeout)
  }, [matchAccusationFailedMessage, clearMatchAccusationFailedMessage])

  function handleExit() {
    leaveTournament()
    navigate('/')
  }

  function handleJoinSubmit() {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    startedRef.current = true
    joinTournament(code)
  }

  function handleCreateSubmit() {
    const parsed = Number(maxParticipantsText)
    const safeValue = Number.isInteger(parsed)
      ? Math.min(MAX_PARTICIPANTS_LIMIT, Math.max(MIN_PARTICIPANTS_LIMIT, parsed))
      : MIN_PARTICIPANTS_LIMIT
    startedRef.current = true
    createTournament(gameIdToCreate ?? '', safeValue)
  }

  // Sin código ni gameId en la URL: solo cabe unirse con un código (crear
  // una sala nueva siempre requiere el gameId, que llega desde "Crear una
  // partida" en el detalle del juego).
  if (!codeFromUrl && !gameIdToCreate && !connecting && !tournament) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
        <div className="mx-auto flex min-h-full max-w-[420px] flex-col justify-center p-5 sm:p-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-[14px] text-text-h">Ingresa el código de un torneo de "¿Quién Es?" para unirte:</p>
            <input
              value={joinCodeInput}
              onChange={(event) => setJoinCodeInput(event.target.value)}
              placeholder="Código de sala"
              className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[14px] tracking-widest uppercase text-text-h"
              maxLength={6}
            />
            <button
              type="button"
              className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={handleJoinSubmit}
            >
              Unirme
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
              onClick={() => navigate('/')}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Con gameId (viene de "Crear una partida" en el detalle del juego, ya
  // decidido el formato de grupo) pero sin código todavía: se pide el cupo
  // máximo antes de crear la sala — no aplica cuando ya se está uniendo por
  // código de un link compartido.
  if (gameIdToCreate && !codeFromUrl && !tournament && !connecting && !startedRef.current) {
    return (
      <Modal onClose={handleExit} maxWidthClassName="max-w-[420px]">
        <div className="flex flex-col gap-4">
          <h2 className="mb-1 text-[19px] tracking-tight text-text-h">Modo grupo</h2>
          <div className="rounded-xl border border-border p-4">
            <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="max-participants-input-2">
              Cupo máximo (hasta 10)
            </label>
            <input
              id="max-participants-input-2"
              type="number"
              min={MIN_PARTICIPANTS_LIMIT}
              max={MAX_PARTICIPANTS_LIMIT}
              className="w-full rounded-lg border border-border bg-bg px-[13px] py-2 text-[14px] text-text-h outline-none focus:border-accent"
              value={maxParticipantsText}
              onChange={(event) => {
                const raw = event.target.value
                const parsed = Number(raw)
                if (raw.trim() !== '' && Number.isInteger(parsed) && parsed > MAX_PARTICIPANTS_LIMIT) {
                  setMaxParticipantsText(String(MAX_PARTICIPANTS_LIMIT))
                  setMaxParticipantsWarning(`El máximo son ${MAX_PARTICIPANTS_LIMIT} jugadores.`)
                  return
                }
                setMaxParticipantsText(raw)
                setMaxParticipantsWarning(null)
              }}
            />
            {maxParticipantsWarning && (
              <p className="mt-1.5 text-[12px] font-medium text-danger" role="alert">
                {maxParticipantsWarning}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-transform hover:-translate-y-0.5"
              onClick={handleExit}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={handleCreateSubmit}
            >
              Crear sala
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  if (connecting || !tournament) {
    return (
      <Modal onClose={handleExit}>
        <p className="text-[14px] text-text">{codeFromUrl ? 'Uniéndote a la sala…' : 'Creando la sala…'}</p>
        {error && (
          <p className="mt-3 text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}
      </Modal>
    )
  }

  const self = tournament.participants.find((p) => p.isSelf)
  const isCreator = tournament.creatorUserId === user?.id
  const iAmEliminated = self?.eliminated ?? false
  const tournamentWinnerName = tournament.participants.find((p) => p.userId === tournament.winnerUserId)?.displayName

  if (tournament.phase === 'WAITING') return <MultiplayerLobby
    room={{ ...tournament, players: tournament.participants }} roomPath={`/quien-es/torneo/${encodeURIComponent(tournament.code)}`}
    maxPlayers={tournament.maxParticipants} isHost={isCreator} connecting={connecting} error={error} requireEven
    turnDurationSeconds={tournament.turnDurationSeconds} onUpdateTurnDuration={updateTurnDuration}
    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  />

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      {showPairingOverlay && pairingAnnouncement && (
        <PairingAnnouncementOverlay announcement={pairingAnnouncement} selfUserId={user?.id ?? null} />
      )}

      <div className={tournament.myMatch?.phase === 'PLAYING' ? 'guess-who-play-shell' : 'mx-auto flex min-h-full max-w-[1560px] flex-col p-5 sm:p-8'}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[19px] tracking-tight text-text-h">{tournament.gameTitle} — Grupo</h2>
            {tournament.phase === 'RUNNING' && (
              <p className="text-[12.5px] text-text">Ronda {tournament.currentRound}</p>
            )}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
            onClick={handleExit}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Salir
          </button>
        </div>

        {error && (
          <p
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        {matchAccusationFailedMessage && (
          <p
            className="mb-4 rounded-lg border border-border bg-code-bg px-[13px] py-[11px] text-sm leading-snug text-text-h animate-[fade-in-up_0.2s_ease-out]"
            role="status"
          >
            {matchAccusationFailedMessage}{' '}
            {tournament.myMatch?.players.find((player) => player.userId === tournament.myMatch?.activePlayerUserId)?.displayName
              ? `Turno de ${tournament.myMatch.players.find((player) => player.userId === tournament.myMatch?.activePlayerUserId)?.displayName}.`
              : ''}
          </p>
        )}

        {tournament.phase === 'RUNNING' && iAmEliminated && (
          <EliminatedSummary tournament={tournament} selfUserId={user?.id ?? null} />
        )}

        {tournament.phase === 'RUNNING' && !iAmEliminated && tournament.myMatch && self && (
          <RunningMatch
            error={error}
            onSend={sendMatchMessage}
            onAsk={askQuestion}
            onAnswer={answerQuestion}
            disconnected={connecting}
            match={tournament.myMatch}
            accusationMessage={matchAccusationFailedMessage ? 'Bandera equivocada' : null}
            discardMatchCard={discardMatchCard}
            accuseMatchCard={accuseMatchCard}
            passMatchTurn={passMatchTurn}
            selfUserId={user?.id ?? null}
          />
        )}

        {tournament.phase === 'RUNNING' && !iAmEliminated && !tournament.myMatch && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-[14px] font-medium text-text-h">Avanzaste esta ronda sin jugar (bye).</p>
            <p className="text-[13px] text-text">Esperando a que termine la ronda…</p>
          </div>
        )}

        {tournament.phase === 'FINISHED' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-white animate-[trophy-pop-in_0.5s_cubic-bezier(0.16,1,0.3,1)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Trophy className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[18px] font-semibold text-text-h">
              {self?.userId === tournament.winnerUserId ? '¡Ganaste el torneo!' : `Ganó el torneo ${tournamentWinnerName}`}
            </p>
            <RoundsRanking tournament={tournament} selfUserId={user?.id ?? null} />
            <button
              type="button"
              className="mt-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={handleExit}
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RunningMatch({
  error,
  onSend,
  onAsk,
  onAnswer,
  disconnected,
  match,
  accusationMessage,
  discardMatchCard,
  accuseMatchCard,
  passMatchTurn,
  selfUserId,
}: {
  error: string | null
  onSend: (text: string) => void
  onAsk: (questionId: string) => void
  onAnswer: (requestId: string, answer: boolean) => void
  disconnected: boolean
  match: NonNullable<ReturnType<typeof useGuessWhoTournament>['tournament']>['myMatch']
  accusationMessage?: string | null
  discardMatchCard: (cardId: string) => void
  accuseMatchCard: (cardId: string) => void
  passMatchTurn: () => void
  selfUserId: string | null
}) {
  if (!match) return null
  const self = match.players.find((p) => p.userId === selfUserId)
  const opponent = match.players.find((p) => p.userId !== selfUserId)
  if (!self || !opponent) return null

  const isMyTurn = match.phase === 'PLAYING' && match.activePlayerUserId === selfUserId
  const canAccuse = match.phase === 'PLAYING' && isMyTurn && self.discardedCardIds.length >= MIN_DISCARDS_TO_ACCUSE

  if (match.phase === 'PLAYING') {
    return (
      <div className="guess-who-play-panels">
      <div className="guess-who-play-board">
      <MatchBoard
        cards={match.cards}
        self={self}
        opponent={opponent}
        isMyTurn={isMyTurn}
        canAccuse={canAccuse}
        accusationMessage={accusationMessage}
        turnDeadline={match.turnDeadline}
        turnDurationSeconds={match.turnDurationSeconds}
        onDiscard={discardMatchCard}
        onAccuse={accuseMatchCard}
        onPassTurn={passMatchTurn}
      />
      </div>
      <ChatPanel key={match.matchCode} inline error={error} messages={match.guidedChat ?? []} selfUserId={selfUserId} onSend={onSend} disconnected={disconnected}
        guided={{ cards: match.cards, questions: match.suggestedQuestions ?? [], pending: match.pendingQuestion ?? null, isMyTurn, onAsk, onAnswer }} />
      </div>
    )
  }

  const winnerIsSelf = match.winnerUserId === selfUserId
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Trophy className="h-8 w-8 text-accent" strokeWidth={1.75} />
      <p className="text-[16px] font-semibold text-text-h">
        {winnerIsSelf ? '¡Ganaste esta ronda!' : `Ganó ${opponent.displayName}`}
      </p>
      <p className="text-[13px] text-text">Esperando a que termine la ronda…</p>
    </div>
  )
}

function EliminatedSummary({
  tournament,
  selfUserId,
}: {
  tournament: NonNullable<ReturnType<typeof useGuessWhoTournament>['tournament']>
  selfUserId: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
        <Skull className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <p className="text-[18px] font-semibold text-text-h">Fuiste eliminado</p>
      <p className="text-[13px] text-text">El torneo sigue sin ti. Aquí puedes ver el progreso general.</p>
      <RoundsRanking tournament={tournament} selfUserId={selfUserId} />
    </div>
  )
}

function RoundsRanking({
  tournament,
  selfUserId,
}: {
  tournament: NonNullable<ReturnType<typeof useGuessWhoTournament>['tournament']>
  selfUserId: string | null
}) {
  const ranked = [...tournament.participants].sort((a, b) => b.points - a.points)

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-4 text-left">
      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-h">
          <Crown className="h-4 w-4 text-accent" strokeWidth={2} />
          Sigue vivos / puntos
        </p>
        <div className="flex flex-col gap-1.5">
          {ranked.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center justify-between rounded-lg bg-code-bg px-3 py-1.5 text-[12.5px]"
            >
              <span className={`font-medium ${participant.eliminated ? 'text-text line-through' : 'text-text-h'}`}>
                {participant.displayName}
                {participant.userId === selfUserId ? ' (tú)' : ''}
              </span>
              <span className="text-text">
                {participant.points} pts{participant.eliminated ? ` · eliminado ronda ${participant.eliminatedAtRound}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-[13px] font-semibold text-text-h">Rondas</p>
        <div className="flex flex-col gap-2">
          {tournament.rounds.map((round) => (
            <div key={round.round} className="rounded-lg bg-code-bg px-3 py-2 text-[12px] text-text">
              <p className="mb-1 font-semibold text-text-h">Ronda {round.round}</p>
              {round.matches.map((match) => (
                <p key={match.matchCode}>
                  {match.isBye
                    ? `Bye para ${tournament.participants.find((p) => p.userId === match.playerUserIds[0])?.displayName ?? '???'}`
                    : match.winnerUserId
                      ? `Ganó ${tournament.participants.find((p) => p.userId === match.winnerUserId)?.displayName ?? '???'}`
                      : 'En curso'}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PairingAnnouncementOverlay({
  announcement,
  selfUserId,
}: {
  announcement: { pairing: { userId: string; displayName: string }[] }
  selfUserId: string | null
}) {
  const teammate = announcement.pairing.find((p) => p.userId !== selfUserId)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm animate-[modal-backdrop-in_0.2s_ease-out] text-center">
      <Users className="h-10 w-10 text-white" strokeWidth={1.75} />
      <p className="text-[14px] font-medium tracking-wide text-white/80 uppercase">Nueva ronda</p>
      <p className="text-[24px] font-bold text-white animate-[fade-in-up_0.3s_ease-out]">
        Tu rival es: {teammate?.displayName ?? '???'}
      </p>
    </div>
  )
}
