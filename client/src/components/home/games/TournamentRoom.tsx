import { GameInstructionsGate } from './GameInstructionsGate'
import { MultiplayerLobby } from './MultiplayerLobby'
import { useEffect, useRef, useState } from 'react'
import { Crown, LogOut, Skull, Trophy, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoTournament } from './useGuessWhoTournament'
import { Modal } from './Modal'
import { MatchBoard } from './MatchBoard'
import { MIN_DISCARDS_TO_ACCUSE } from './guessWhoTypes'

type TournamentRoomProps = {
  gameId: string
  onExit: () => void
  initialJoinCode?: string
  /** El modo "grupo" ya se decidió un nivel arriba: salta directo a la config de cupo para crear. */
  skipEntryChoice?: boolean
  /**
   * Avisa hacia arriba el código de sala en cuanto el servidor lo confirma,
   * para reflejarlo en la URL sin afectar el ciclo de vida del socket.
   */
  onRoomCodeChange?: (code: string | null) => void
}

/** Antes de entrar a la sala grupal, cada jugador decide si crea una sala nueva o se une con un código. */
type EntryChoice = 'undecided' | 'choosing-create' | 'joining-input' | 'creating' | 'joining'

/** Debe coincidir con TOURNAMENT_MAX_PARTICIPANTS del gateway. */
const MAX_PARTICIPANTS_LIMIT = 10
const MIN_PARTICIPANTS_LIMIT = 2

/**
 * Sala de torneo eliminatorio (modo grupo de "¿Quién Es?"): crear/unirse a
 * una sala grupal, confirmar que todos están listos, ver el anuncio de
 * compañero de ronda, jugar el match 1v1 de la ronda (reutilizando
 * MatchBoard) y, si se es eliminado, ver el resumen del torneo en vez de la
 * partida de los demás.
 */
export function TournamentRoom(props: TournamentRoomProps) {
  return <GameInstructionsGate kind={'GUESS_WHO_GROUP'}><TournamentSession {...props} /></GameInstructionsGate>
}

function TournamentSession({
  gameId,
  onExit,
  initialJoinCode,
  skipEntryChoice,
  onRoomCodeChange,
}: TournamentRoomProps) {
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
    updateTurnDuration,
    leaveTournament,
    discardMatchCard,
    accuseMatchCard,
    passMatchTurn,
  } = useGuessWhoTournament(token)

  const [entryChoice, setEntryChoice] = useState<EntryChoice>(
    initialJoinCode ? 'joining' : skipEntryChoice ? 'choosing-create' : 'undecided',
  )
  const [joinCode, setJoinCode] = useState(initialJoinCode ?? '')
  const [maxParticipantsText, setMaxParticipantsText] = useState('4')
  const [maxParticipantsWarning, setMaxParticipantsWarning] = useState<string | null>(null)
  const [showPairingOverlay, setShowPairingOverlay] = useState(false)
  const joinedWithInitialCode = useRef(false)
  useEffect(() => {
    if (!initialJoinCode || joinedWithInitialCode.current) return
    joinedWithInitialCode.current = true
    joinTournament(initialJoinCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinCode])
  // Solo refleja el código hacia arriba (para la URL); no participa del
  // ciclo de vida del socket ni del torneo.
  useEffect(() => {
    onRoomCodeChange?.(tournament?.code ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.code])

  // El anuncio de compañero se muestra unos segundos y luego se auto-cierra
  // para dar paso al tablero del match, que ya llega vía tournament:state.
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
    onExit()
  }

  if (entryChoice === 'undecided' || entryChoice === 'choosing-create') {
    const isChoosingCreate = entryChoice === 'choosing-create'
    return (
      <Modal onClose={handleExit} maxWidthClassName="max-w-[420px]">
        <h2 className="mb-1 text-[19px] tracking-tight text-text-h">Modo grupo</h2>
        <p className="mb-6 text-[13px] text-text">¿Vas a crear la sala o a unirte con un código?</p>

        {!isChoosingCreate && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-lg px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={() => setEntryChoice('choosing-create')}
              >
                Crear sala
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-3 text-[14.5px] font-semibold text-text-h transition-transform hover:-translate-y-0.5"
                onClick={() => setEntryChoice('joining-input')}
              >
                Unirme a sala
              </button>
            </div>
            <button
              type="button"
              className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
              onClick={handleExit}
            >
              Cancelar
            </button>
          </>
        )}

        {isChoosingCreate && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border p-4">
              <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="max-participants-input">
                Cupo máximo (hasta 10)
              </label>
              <input
                id="max-participants-input"
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
                onClick={() => (skipEntryChoice ? handleExit() : setEntryChoice('undecided'))}
              >
                Atrás
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={() => {
                  const parsed = Number(maxParticipantsText)
                  const safeValue = Number.isInteger(parsed)
                    ? Math.min(MAX_PARTICIPANTS_LIMIT, Math.max(MIN_PARTICIPANTS_LIMIT, parsed))
                    : MIN_PARTICIPANTS_LIMIT
                  setEntryChoice('creating')
                  createTournament(gameId, safeValue)
                }}
              >
                Crear sala
              </button>
            </div>
          </div>
        )}
      </Modal>
    )
  }

  if (entryChoice === 'joining-input') {
    return (
      <Modal onClose={handleExit} maxWidthClassName="max-w-[420px]">
        <h2 className="mb-1 text-[19px] tracking-tight text-text-h">Unirme a sala grupal</h2>
        <p className="mb-6 text-[13px] text-text">Ingresa el código de 6 caracteres que te compartieron.</p>
        <div className="flex gap-2">
          <input
            type="text"
            autoFocus
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-[13px] tracking-widest uppercase text-text-h outline-none focus:border-accent"
            placeholder="CÓDIGO DE SALA"
            value={joinCode}
            maxLength={6}
            onChange={(event) => setJoinCode(event.target.value)}
          />
          <button
            type="button"
            className="shrink-0 rounded-lg border border-border px-3.5 py-2.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
            disabled={joinCode.trim().length !== 6}
            onClick={() => {
              setEntryChoice('joining')
              joinTournament(joinCode.trim())
            }}
          >
            Unirme
          </button>
        </div>
        <button
          type="button"
          className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
          onClick={() => setEntryChoice('undecided')}
        >
          Atrás
        </button>
      </Modal>
    )
  }

  if (connecting || !tournament) {
    return (
      <Modal onClose={handleExit}>
        <p className="text-[14px] text-text">
          {entryChoice === 'joining' ? 'Uniéndote a la sala…' : 'Creando la sala…'}
        </p>
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
    room={{ ...tournament, players: tournament.participants }} roomPath={`/?sala=${encodeURIComponent(tournament.code)}`}
    maxPlayers={tournament.maxParticipants} isHost={isCreator} connecting={connecting} error={error} requireEven
    turnDurationSeconds={tournament.turnDurationSeconds} onUpdateTurnDuration={updateTurnDuration}
    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  />

  return (
    <Modal onClose={handleExit} maxWidthClassName="max-w-[840px]">
      {showPairingOverlay && pairingAnnouncement && (
        <PairingAnnouncementOverlay announcement={pairingAnnouncement} selfUserId={user?.id ?? null} />
      )}

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
    </Modal>
  )
}

function RunningMatch({
  match,
  accusationMessage,
  discardMatchCard,
  accuseMatchCard,
  passMatchTurn,
  selfUserId,
}: {
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
    )
  }

  // match.phase === 'FINISHED': quien ganó ve un breve resultado antes de
  // que el servidor arme la siguiente ronda (o el torneo termine).
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

/** Pantalla que ve quien fue eliminado: no ve las partidas ajenas en vivo, solo el resumen/ranking del torneo. */
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

/** Ranking/progreso del torneo: quién sigue vivo, puntos, y resultado ronda por ronda. */
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
