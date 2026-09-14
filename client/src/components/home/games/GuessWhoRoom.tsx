import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Copy, Link, LogOut, MessageCircle, Send, Swords, Trophy, Users, X, XCircle } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoRoom } from './useGuessWhoRoom'
import { MIN_DISCARDS_TO_ACCUSE, type GuessWhoChatMessage } from './guessWhoTypes'
import { Modal } from './Modal'
import { DealCountdownOverlay, MatchBoard, useCountdown } from './MatchBoard'
import { TournamentRoom } from './TournamentRoom'
import { JoinByCodeModal } from './JoinByCodeModal'
import { ConfettiBurst } from '../../kids/ConfettiBurst'

type GuessWhoRoomProps = {
  gameId: string
  onExit: () => void
  /**
   * Cuando se entra desde "Unirme con código" (botón agnóstico del home), ya
   * se sabe de antemano si la sala es individual o grupal y con qué código
   * — así que se saltan las pantallas de elección y se va directo a unirse.
   */
  initialJoinCode?: string
  initialMode?: 'individual' | 'group'
  /**
   * El modo ya se decidió un nivel arriba (se viene de "Crear sala nueva"),
   * así que este componente debe saltar directo a crear en vez de volver a
   * preguntar crear/unirse.
   */
  skipEntryChoice?: boolean
  /**
   * Avisa hacia arriba el código de sala en cuanto el servidor lo confirma,
   * para que quien monta este componente pueda reflejarlo en la URL sin que
   * eso afecte el ciclo de vida del socket ni de la sala misma.
   */
  onRoomCodeChange?: (code: string | null) => void
}

/**
 * Punto de entrada de "¿Quién Es?": primero se decide "crear sala nueva" o
 * "ingresar a una sala" (con código, agnóstico a individual/grupo — lo
 * resuelve el propio código vía room:resolve-code). Solo al crear se
 * pregunta el modo (Individual o Grupo), porque al unirse el modo ya lo
 * define la sala a la que se entra. Esto evita la doble pregunta que había
 * antes (elegir modo y luego, otra vez, crear/unirse dentro de cada modo).
 */
type EntryStep = 'undecided' | 'joining-by-code' | 'choosing-mode-to-create'
type GameMode = 'individual' | 'group'

export function GuessWhoRoom({ gameId, onExit, initialJoinCode, initialMode, onRoomCodeChange }: GuessWhoRoomProps) {
  const [step, setStep] = useState<EntryStep>('undecided')
  const [mode, setMode] = useState<GameMode | null>(initialMode ?? null)
  const [joinCode, setJoinCode] = useState<string | undefined>(initialJoinCode)

  if (mode && joinCode) {
    return mode === 'group' ? (
      <TournamentRoom gameId={gameId} onExit={onExit} initialJoinCode={joinCode} onRoomCodeChange={onRoomCodeChange} />
    ) : (
      <IndividualGuessWhoRoom
        gameId={gameId}
        onExit={onExit}
        initialJoinCode={joinCode}
        onRoomCodeChange={onRoomCodeChange}
      />
    )
  }

  if (mode) {
    return mode === 'group' ? (
      <TournamentRoom gameId={gameId} onExit={onExit} skipEntryChoice onRoomCodeChange={onRoomCodeChange} />
    ) : (
      <IndividualGuessWhoRoom gameId={gameId} onExit={onExit} skipEntryChoice onRoomCodeChange={onRoomCodeChange} />
    )
  }

  if (step === 'joining-by-code') {
    return (
      <JoinByCodeModal
        onClose={onExit}
        onResolved={(resolved, code) => {
          setMode(resolved.kind === 'tournament' ? 'group' : 'individual')
          setJoinCode(code)
        }}
      />
    )
  }

  if (step === 'choosing-mode-to-create') {
    return (
      <Modal onClose={onExit} maxWidthClassName="max-w-[440px]">
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent p-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">¿Quién Es?</p>
            <h2 className="mt-2 text-[24px] font-bold tracking-tight text-text-h">Elige tu formato</h2>
          </div>
          <p className="text-[13px] text-text">¿Quieres jugar individual (1 contra 1) o en grupo?</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_var(--accent)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={() => setMode('individual')}
            >
              1 contra 1
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-[14.5px] font-semibold text-text-h transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/5"
              onClick={() => setMode('group')}
            >
              Grupo (torneo eliminatorio)
            </button>
          </div>
          <button
            type="button"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
            onClick={() => setStep('undecided')}
          >
            Atrás
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onExit} maxWidthClassName="max-w-[440px]">
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent p-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">¿Quién Es?</p>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight text-text-h">Tu sala</h2>
        </div>
        <p className="text-[13px] text-text">¿Vas a crear una sala nueva o a ingresar a una existente?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_var(--accent)]"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => setStep('choosing-mode-to-create')}
          >
            Crear sala nueva
          </button>
          <button
            type="button"
            className="rounded-2xl border border-border bg-surface px-4 py-3 text-[14.5px] font-semibold text-text-h transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/5"
            onClick={() => setStep('joining-by-code')}
          >
            Ingresar a una sala
          </button>
        </div>
        <button
          type="button"
          className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
          onClick={onExit}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

/**
 * Flujo 1v1 clásico de "¿Quién Es?": crear/unirse a una sala directa por
 * código, jugar, y votar revancha. Un solo componente cubre las 3 fases
 * (WAITING/PLAYING/FINISHED) porque comparten el mismo socket y el mismo
 * layout de tablero — separar en 3 pantallas obligaría a pasar la conexión
 * entre ellas sin ganar nada.
 */
type EntryChoice = 'undecided' | 'joining-input' | 'creating' | 'joining'

function IndividualGuessWhoRoom({
  gameId,
  onExit,
  initialJoinCode,
  skipEntryChoice,
  onRoomCodeChange,
}: GuessWhoRoomProps) {
  const { token, user } = useAuth()
  const {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    dealCountdownMs,
    lastFailedAccusation,
    clearLastFailedAccusation,
    messages,
    createRoom,
    joinRoom,
    startGame,
    updateTurnDuration,
    discardCard,
    accuseCard,
    voteRematch,
    passTurn,
    sendChatMessage,
    leaveRoom,
  } = useGuessWhoRoom(token)
  const [entryChoice, setEntryChoice] = useState<EntryChoice>(
    initialJoinCode ? 'joining' : skipEntryChoice ? 'creating' : 'undecided',
  )
  const [joinCode, setJoinCode] = useState(initialJoinCode ?? '')
  const startedCreatingRef = useRef(false)
  useEffect(() => {
    if (!skipEntryChoice || initialJoinCode || startedCreatingRef.current) return
    startedCreatingRef.current = true
    createRoom(gameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipEntryChoice, initialJoinCode])
  const joinedWithInitialCode = useRef(false)
  useEffect(() => {
    if (!initialJoinCode || joinedWithInitialCode.current) return
    joinedWithInitialCode.current = true
    joinRoom(initialJoinCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJoinCode])
  // Solo refleja el código hacia arriba (para la URL); no participa del
  // ciclo de vida del socket ni de la sala.
  useEffect(() => {
    onRoomCodeChange?.(room?.code ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])
  const [chatOpen, setChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  useEffect(() => {
    if (messages.length === 0) return
    if (!chatOpen) setUnreadCount((current) => current + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])
  // dealCountdownMs es una duración (ms) que llega una sola vez con el evento
  // room:dealing; se ancla a un deadline absoluto apenas cambia, para que
  // useCountdown pueda tickear sin depender de que el padre re-renderice.
  const [dealDeadline, setDealDeadline] = useState<number | null>(null)
  useEffect(() => {
    if (dealCountdownMs === null) {
      setDealDeadline(null)
      return
    }
    setDealDeadline(Date.now() + dealCountdownMs)
  }, [dealCountdownMs])
  const dealRemainingMs = useCountdown(dealDeadline)
  // Segundos por turno para la próxima partida: solo el host lo edita (se
  // guarda como texto, no número, para poder dejar el campo vacío mientras
  // se reescribe sin que un input controlado lo fuerce de vuelta a "0"). Se
  // emite al servidor en cada cambio válido para que el rival lo vea en
  // vivo vía room:update-turn-duration. Para quien NO es host, se
  // resincroniza en cada room:state (así ve el valor del host en vivo); para
  // el host solo al entrar a una sala nueva, para no pisar lo que esté
  // escribiendo cuando le llegue de vuelta su propio cambio ya confirmado.
  const isHostSelf = room?.players.find((player) => player.isSelf)?.isHost ?? false
  const [turnDurationText, setTurnDurationText] = useState('15')
  useEffect(() => {
    if (room?.turnDurationSeconds === undefined) return
    if (isHostSelf) return
    setTurnDurationText(String(room.turnDurationSeconds))
  }, [room?.turnDurationSeconds, isHostSelf])
  useEffect(() => {
    if (room?.turnDurationSeconds !== undefined) setTurnDurationText(String(room.turnDurationSeconds))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  function handleExit() {
    leaveRoom()
    onExit()
  }

  // Aviso temporal de acusación fallida: se autolimpia para no quedar
  // pegado en pantalla una vez el jugador ya vio el mensaje.
  useEffect(() => {
    if (!lastFailedAccusation) return
    const timeout = setTimeout(clearLastFailedAccusation, 3500)
    return () => clearTimeout(timeout)
  }, [lastFailedAccusation, clearLastFailedAccusation])

  // Redacta el aviso según desde qué lado se mira: a quien acusó y falló se
  // le dice explícitamente de quién NO era la carta (lo que pidió el
  // reporte: "esa no es la [tarjeta] de fulano"); al otro jugador se le
  // avisa que intentaron adivinar la suya y no lo lograron.
  const nextTurnPlayer = room?.players.find((player) => player.userId === room.activePlayerUserId)
  const accusationFailedMessage =
    lastFailedAccusation &&
    `Bandera equivocada. Turno de ${nextTurnPlayer?.displayName ?? 'tu rival'}.`

  function copyRoomLink() {
    if (!room) return
    const url = new URL(window.location.href)
    url.searchParams.set('sala', room.code)
    void navigator.clipboard.writeText(url.toString()).then(() => {
      setCopyFeedback('Enlace copiado')
      setTimeout(() => setCopyFeedback(null), 1800)
    })
  }

  // El rival votó "no" a la revancha: el servidor ya cerró la sala, así que
  // solo queda avisar y devolver a la persona a la pantalla anterior.
  if (rematchRejectedMessage) {
    return (
      <Modal onClose={onExit} maxWidthClassName="max-w-[420px]">
        <div className="flex flex-col items-center gap-3 py-4 text-center animate-[fade-in-up_0.3s_ease-out]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <LogOut className="h-6 w-6" strokeWidth={2} />
          </span>
          <p className="text-[15px] font-semibold text-text-h">Saliste de la partida</p>
          <p className="text-[13px] text-text">{rematchRejectedMessage}</p>
          <button
            type="button"
            className="mt-2 w-full rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={onExit}
          >
            Entendido
          </button>
        </div>
      </Modal>
    )
  }

  // Antes de tocar el socket, cada jugador elige explícitamente si va a
  // crear la sala o a unirse con un código: si en vez de esto se creara una
  // sala automáticamente al entrar, el segundo jugador jamás podría unirse a
  // la del primero — cada apertura del modal generaría su propia sala nueva.
  if (entryChoice === 'undecided') {
    return (
      <Modal onClose={handleExit} maxWidthClassName="max-w-[420px]">
        <h2 className="mb-1 text-[19px] tracking-tight text-text-h">¿Quién Es?</h2>
        <p className="mb-6 text-[13px] text-text">¿Vas a crear la sala o a unirte con un código?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => {
              setEntryChoice('creating')
              createRoom(gameId)
            }}
          >
            Crear sala nueva
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
      </Modal>
    )
  }

  if (entryChoice === 'joining-input') {
    return (
      <Modal onClose={handleExit} maxWidthClassName="max-w-[420px]">
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent p-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Unirte</p>
            <h2 className="mt-2 text-[24px] font-bold tracking-tight text-text-h">Sala privada</h2>
          </div>
          <p className="text-[13px] text-text">Ingresa el código de 6 caracteres que te compartieron.</p>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] tracking-widest uppercase text-text-h outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
              placeholder="CÓDIGO DE SALA"
              value={joinCode}
              maxLength={6}
              onChange={(event) => setJoinCode(event.target.value)}
            />
            <button
              type="button"
              className="shrink-0 rounded-xl border border-accent/50 bg-accent/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:border-border disabled:bg-bg disabled:text-text disabled:opacity-50"
              disabled={joinCode.trim().length !== 6}
              onClick={() => {
                setEntryChoice('joining')
                joinRoom(joinCode.trim())
              }}
            >
              Unirme
            </button>
          </div>
          <button
            type="button"
            className="w-full rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
            onClick={() => setEntryChoice('undecided')}
          >
            Atrás
          </button>
        </div>
      </Modal>
    )
  }

  if (connecting || !room) {
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

  const self = room.players.find((player) => player.isSelf)
  const opponent = room.players.find((player) => !player.isSelf)
  const isMyTurn = room.phase === 'PLAYING' && room.activePlayerUserId === self?.userId
  const canAccuse =
    room.phase === 'PLAYING' && isMyTurn && (self?.discardedCardIds.length ?? 0) >= MIN_DISCARDS_TO_ACCUSE
  const winnerIsSelf = room.winnerUserId === user?.id
  const dealing = dealDeadline !== null && dealRemainingMs > 0

  return (
    <>
      <Modal onClose={handleExit} maxWidthClassName="max-w-[840px]">
      {dealing && <DealCountdownOverlay remainingMs={dealRemainingMs} />}

      <div className="mb-5 rounded-[24px] border border-border/80 bg-gradient-to-r from-accent/8 via-surface to-bg p-4 shadow-[var(--shadow)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Sala activa</p>
            <h2 className="mt-1 text-[22px] font-bold tracking-tight text-text-h">{room.gameTitle}</h2>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="relative flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
              onClick={() => {
                setChatOpen((current) => !current)
                setUnreadCount(0)
              }}
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
              Chat
              {!chatOpen && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
              onClick={handleExit}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Salir
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface/90 p-3">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-text">
            <span className="font-medium text-text-h">Código de sala:</span>
            <code className="rounded-lg border border-accent/30 bg-accent/5 px-2 py-1 text-[13px] font-semibold text-accent">
              {room.code}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg px-2.5 py-1.5 text-[11px] font-medium text-text-h transition-colors hover:border-accent hover:text-accent"
              onClick={() => {
                void navigator.clipboard.writeText(room.code).then(() => {
                  setCopyFeedback('Código copiado')
                  setTimeout(() => setCopyFeedback(null), 1800)
                })
              }}
            >
              <Copy className="h-3 w-3" strokeWidth={2} />
              Copiar código
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/20"
              onClick={copyRoomLink}
            >
              <Link className="h-3 w-3" strokeWidth={2} />
              Copiar enlace
            </button>
            {copyFeedback && <span className="text-[11px] font-medium text-accent" role="status">{copyFeedback}</span>}
          </div>
        </div>
      </div>

      {error && (
        <p
          className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      {accusationFailedMessage && (
        // Más visible que un simple texto: ícono + color de error, para que
        // quede claro que esto es feedback de "fallaste" y no se confunda
        // con el aviso de cambio de turno que aparece al mismo tiempo.
        <div
          className="mb-4 flex items-center gap-2.5 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug font-medium text-danger animate-[fade-in-up_0.2s_ease-out]"
          role="status"
        >
          <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
          {accusationFailedMessage}
        </div>
      )}

      {room.phase === 'WAITING' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-[24px] border border-border bg-gradient-to-br from-bg to-surface p-4 shadow-[var(--shadow)]">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-text-h">
              <Users className="h-4 w-4 text-accent" strokeWidth={2} />
              Jugadores en la sala ({room.players.length}/2)
            </p>
            <div className="flex flex-wrap gap-2">
              {room.players.map((player) => (
                <span
                  key={player.userId}
                  className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-[12.5px] font-medium text-text-h"
                >
                  {player.displayName}
                  {player.isSelf ? ' (tú)' : ''}
                </span>
              ))}
            </div>
          </div>

          {self?.isHost ? (
            <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
              <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="turn-duration-input">
                Segundos por turno
              </label>
              <input
                id="turn-duration-input"
                type="number"
                min={5}
                max={120}
                className="w-full rounded-xl border border-border bg-bg px-[13px] py-2.5 text-[14px] text-text-h outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
                value={turnDurationText}
                onChange={(event) => {
                  const raw = event.target.value
                  setTurnDurationText(raw)
                  const parsed = Number(raw)
                  if (raw.trim() !== '' && Number.isInteger(parsed) && parsed >= 5 && parsed <= 120) {
                    updateTurnDuration(parsed)
                  }
                }}
              />
              <p className="mt-1 text-[11.5px] text-text">
                Si nadie actúa a tiempo, el turno pasa automático. Entre 5 y 120 segundos.
              </p>
            </div>
          ) : (
            <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
              <p className="text-[12.5px] text-text">
                Segundos por turno: <strong className="text-text-h">{turnDurationText}</strong> (lo define
                quien creó la sala).
              </p>
            </div>
          )}

          {isHostSelf ? (
            <button
              type="button"
              className="rounded-2xl px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-all duration-200 hover:not-disabled:-translate-y-0.5 hover:shadow-[0_16px_28px_-14px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              disabled={room.players.length !== 2}
              onClick={() => startGame(Number(turnDurationText) || undefined)}
            >
              {room.players.length === 2 ? 'Barajar y empezar' : 'Esperando al segundo jugador…'}
            </button>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-center text-[13px] text-text shadow-[var(--shadow)]">
              {room.players.length === 2
                ? 'Esperando a que el anfitrión inicie la partida…'
                : 'Esperando al segundo jugador…'}
            </p>
          )}
        </div>
      )}

      {room.phase === 'PLAYING' && self && opponent && (
        <MatchBoard
          cards={room.cards}
          self={self}
          opponent={opponent}
          isMyTurn={isMyTurn}
          canAccuse={canAccuse}
          accusationMessage={lastFailedAccusation ? 'Bandera equivocada' : null}
          turnDeadline={room.turnDeadline}
          turnDurationSeconds={room.turnDurationSeconds}
          onDiscard={discardCard}
          onAccuse={accuseCard}
          onPassTurn={passTurn}
        />
      )}

      {room.phase === 'FINISHED' && opponent && self && (
        <div className="relative flex flex-col items-center gap-4 py-6 text-center">
          {winnerIsSelf && <ConfettiBurst trigger={room.winnerUserId ?? 'win'} />}
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full text-white animate-[trophy-pop-in_0.5s_cubic-bezier(0.16,1,0.3,1)]"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            <Trophy className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <p className="text-[18px] font-semibold text-text-h animate-[fade-in-up_0.4s_ease-out_0.1s_backwards]">
            {winnerIsSelf ? '¡Ganaste!' : `Ganó ${room.players.find((p) => p.userId === room.winnerUserId)?.displayName}`}
          </p>

          {/* Se revelan ambas tarjetas secretas (con imagen, no solo texto)
              para que quien perdió vea exactamente qué tarjeta era la del
              rival y en qué se equivocó, en vez de un simple mensaje de
              texto. */}
          <div className="flex items-start justify-center gap-4 animate-[fade-in-up_0.4s_ease-out_0.2s_backwards]">
            <RevealedSecretCard
              ownerLabel="Tu tarjeta era"
              card={room.cards.find((card) => card.cardId === self.secretCardId)}
              isWinner={self.userId === room.winnerUserId}
            />
            <RevealedSecretCard
              ownerLabel={`Tarjeta de ${opponent.displayName}`}
              card={room.cards.find((card) => card.cardId === opponent.secretCardId)}
              isWinner={opponent.userId === room.winnerUserId}
            />
          </div>

          {!self.hasVotedRematch && (
            <div className="flex w-full max-w-[320px] flex-col gap-3 rounded-xl border border-border p-4 animate-[fade-in-up_0.4s_ease-out_0.3s_backwards]">
              <p className="text-[13px] font-medium text-text-h">¿Quieres jugar otra ronda?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                  onClick={() => voteRematch(true)}
                >
                  Sí, seguir
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h transition-transform hover:-translate-y-0.5"
                  onClick={() => {
                    // El servidor borra la sala apenas recibe un rechazo (no
                    // hay vuelta atrás), así que quien rechaza no espera
                    // ningún room:state nuevo — sale directo en vez de
                    // quedarse pegado en esta pantalla esperando una
                    // respuesta que nunca llega.
                    voteRematch(false)
                    handleExit()
                  }}
                >
                  No, salir
                </button>
              </div>
            </div>
          )}

          {self.hasVotedRematch && (
            <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-[13px] font-medium text-text-h animate-[fade-in-up_0.3s_ease-out]">
              Esperando la respuesta de {opponent.displayName}
              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[waiting-dot-bounce_1.2s_ease-in-out_infinite]" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[waiting-dot-bounce_1.2s_ease-in-out_0.15s_infinite]" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[waiting-dot-bounce_1.2s_ease-in-out_0.3s_infinite]" />
              </span>
            </div>
          )}

          <button
            type="button"
            className="text-[12.5px] font-medium text-text underline-offset-2 hover:text-text-h hover:underline"
            onClick={handleExit}
          >
            Salir sin votar
          </button>
        </div>
      )}
      </Modal>

      {chatOpen && (
        <ChatPanel
          messages={messages}
          selfUserId={self?.userId ?? null}
          onClose={() => setChatOpen(false)}
          onSend={sendChatMessage}
        />
      )}
    </>
  )
}

/**
 * Tarjeta secreta revelada al terminar la partida: imagen + etiqueta reales
 * en vez del texto plano de antes, para que se entienda de un vistazo qué
 * tarjeta tenía cada quien. La del ganador lleva una insignia de trofeo.
 */
function RevealedSecretCard({
  ownerLabel,
  card,
  isWinner,
}: {
  ownerLabel: string
  card: { imageUrl: string; label: string } | undefined
  isWinner: boolean
}) {
  if (!card) return null
  return (
    <div className="flex w-[112px] flex-col items-center gap-1.5">
      <div
        className={`relative overflow-hidden rounded-lg border-2 ${isWinner ? 'border-accent' : 'border-border'}`}
      >
        <img src={card.imageUrl} alt="" className="h-24 w-full object-cover" />
        {isWinner && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
            <Trophy className="h-3 w-3" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-text">{ownerLabel}</p>
      <p className="text-[12.5px] font-semibold text-text-h">{card.label}</p>
    </div>
  )
}

/**
 * Panel de chat de la sala 1v1: flota sobre el modal del juego para que los
 * dos jugadores puedan coordinarse por texto sin llamada ni estar en
 * persona. No guarda historial en el servidor — solo lo que llegó mientras
 * el socket de este cliente estuvo conectado a la sala.
 */
function ChatPanel({
  messages,
  selfUserId,
  onClose,
  onSend,
}: {
  messages: GuessWhoChatMessage[]
  selfUserId: string | null
  onClose: () => void
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <div
      className="fixed right-5 bottom-5 z-[80] flex h-[420px] w-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)] animate-[modal-panel-in_0.2s_cubic-bezier(0.16,1,0.3,1)]"
      role="dialog"
      aria-label="Chat de la sala"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-text-h">
          <MessageCircle className="h-4 w-4 text-accent" strokeWidth={2} />
          Chat de la partida
        </p>
        <button
          type="button"
          className="text-text hover:text-accent"
          onClick={onClose}
          aria-label="Cerrar chat"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="m-auto text-center text-[12.5px] text-text">
            Todavía no hay mensajes. Escribe algo para coordinar con tu rival.
          </p>
        ) : (
          messages.map((message, index) => {
            const isSelf = message.userId === selfUserId
            return (
              <div
                key={`${message.sentAt}-${index}`}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                {!isSelf && (
                  <span className="mb-0.5 px-1 text-[10.5px] font-medium text-text">
                    {message.displayName}
                  </span>
                )}
                <span
                  className={`max-w-[85%] rounded-lg px-3 py-1.5 text-[13px] leading-snug break-words ${
                    isSelf ? 'text-white' : 'border border-border text-text-h'
                  }`}
                  style={isSelf ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' } : undefined}
                >
                  {message.text}
                </span>
              </div>
            )
          })
        )}
      </div>

      <form className="flex gap-2 border-t border-border p-3" onSubmit={handleSubmit}>
        <input
          type="text"
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text-h outline-none focus:border-accent"
          placeholder="Escribe un mensaje…"
          maxLength={500}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          disabled={!text.trim()}
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}

