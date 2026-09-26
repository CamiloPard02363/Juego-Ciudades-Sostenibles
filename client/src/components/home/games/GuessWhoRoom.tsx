import { GameInstructionsGate } from './GameInstructionsGate'
import { MultiplayerLobby } from './MultiplayerLobby'
import { ChatPanel } from './ChatPanel'
import { useEffect, useRef, useState } from 'react'
import { Copy, Link, LogOut, MessageCircle, Trophy, XCircle } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoRoom } from './useGuessWhoRoom'
import { MIN_DISCARDS_TO_ACCUSE } from './guessWhoTypes'
import { Modal } from './Modal'
import { DealCountdownOverlay, MatchBoard, useCountdown } from './MatchBoard'
import { TournamentRoom } from './TournamentRoom'
import { ConfettiBurst } from '../../kids/ConfettiBurst'
import { CardInfoBubble } from './CardInfoBubble'

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
   * El modo ya se decidió un nivel arriba (se viene de la elección de formato
   * 1 contra 1 / Grupo), así que este componente debe saltar directo a crear
   * en vez de volver a preguntar crear/unirse.
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
 * Punto de entrada de "¿Quién Es?" al pulsar "Crear una partida" en el detalle
 * del juego: pregunta directamente el formato (1 contra 1 o Grupo). Unirse con
 * un código no se pregunta acá — el detalle del juego ya tiene su apartado
 * "Únete a una partida ya creada" (y el home su botón "Unirme con código"), y
 * ambos llegan con `initialJoinCode`/`initialMode` ya resueltos, así que se
 * saltan esta pantalla. Antes había una pantalla intermedia ("Tu sala": crear
 * sala nueva / ingresar a una sala) que repetía justo esa misma elección.
 */
type GameMode = 'individual' | 'group'

export function GuessWhoRoom({ gameId, onExit, initialJoinCode, initialMode, onRoomCodeChange }: GuessWhoRoomProps) {
  const [mode, setMode] = useState<GameMode | null>(initialMode ?? null)
  const [joinCode] = useState<string | undefined>(initialJoinCode)

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

function IndividualGuessWhoRoom(props: GuessWhoRoomProps) {
  return <GameInstructionsGate kind="GUESS_WHO"><IndividualGuessWhoSession {...props} /></GameInstructionsGate>
}

function IndividualGuessWhoSession({
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
    setReady,
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

  if (room.phase === 'WAITING') return <MultiplayerLobby
    room={room} roomPath={`/?sala=${encodeURIComponent(room.code)}`} maxPlayers={2}
    isHost={Boolean(self?.isHost)} connecting={connecting} error={error}
    turnDurationSeconds={room.turnDurationSeconds} onUpdateTurnDuration={updateTurnDuration}
    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  >{dealing && <DealCountdownOverlay remainingMs={dealRemainingMs} />}</MultiplayerLobby>

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
  card: { imageUrl: string; label: string; info?: string | null } | undefined
  isWinner: boolean
}) {
  if (!card) return null
  return (
    <div className="relative flex w-[112px] flex-col items-center gap-1.5">
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
      {card.info && <CardInfoBubble info={card.info} label={card.label} />}
      <p className="text-[11px] font-medium text-text">{ownerLabel}</p>
      <p className="text-[12.5px] font-semibold text-text-h">{card.label}</p>
    </div>
  )
}
