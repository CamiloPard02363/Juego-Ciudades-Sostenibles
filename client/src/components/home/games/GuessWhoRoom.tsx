import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Copy, LogOut, MessageCircle, Send, SkipForward, Swords, Trophy, Users, Volume2, X } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoRoom } from './useGuessWhoRoom'
import type { GuessWhoChatMessage } from './guessWhoTypes'
import { Modal } from './Modal'

/**
 * Cuenta el tiempo restante hasta `deadline` (epoch ms) y se refresca cada
 * 200ms. Usado tanto por el countdown de reparto (3-2-1) como por la barra
 * de tiempo del turno — 200ms es suficiente para que se vea fluido sin
 * generar un re-render por frame.
 */
function useCountdown(deadline: number | null): number {
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (deadline === null) {
      setRemainingMs(0)
      return
    }
    const tick = () => setRemainingMs(Math.max(0, deadline - Date.now()))
    tick()
    const interval = setInterval(tick, 200)
    return () => clearInterval(interval)
  }, [deadline])

  return remainingMs
}

type GuessWhoRoomProps = {
  gameId: string
  onExit: () => void
}

/**
 * Pantalla de sala + partida de "¿Quién Es?" en vivo. Un solo componente
 * cubre las 3 fases (WAITING/PLAYING/FINISHED) porque comparten el mismo
 * socket y el mismo layout de tablero — separar en 3 pantallas obligaría a
 * pasar la conexión entre ellas sin ganar nada.
 */
type EntryChoice = 'undecided' | 'creating' | 'joining'

export function GuessWhoRoom({ gameId, onExit }: GuessWhoRoomProps) {
  const { token, user } = useAuth()
  const {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    dealCountdownMs,
    messages,
    createRoom,
    joinRoom,
    startGame,
    discardCard,
    accuseCard,
    voteRematch,
    passTurn,
    sendChatMessage,
    leaveRoom,
  } = useGuessWhoRoom(token)
  const [entryChoice, setEntryChoice] = useState<EntryChoice>('undecided')
  const [joinCode, setJoinCode] = useState('')
  const [accusing, setAccusing] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
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
  const turnRemainingMs = useCountdown(room?.turnDeadline ?? null)
  // Segundos por turno para la próxima partida: se elige aquí, en la sala,
  // no al crear el juego — cada partida en vivo puede querer un ritmo
  // distinto. Se sincroniza con el valor del juego solo al entrar a una
  // sala nueva (room.code cambia), para no pisar lo que la persona ya
  // esté escribiendo cuando el rival se une y llega un room:state nuevo.
  const [turnDurationInput, setTurnDurationInput] = useState(15)
  useEffect(() => {
    if (room?.turnDurationSeconds !== undefined) setTurnDurationInput(room.turnDurationSeconds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  function handleExit() {
    leaveRoom()
    onExit()
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
        <div className="flex flex-col gap-3">
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
          <div className="flex gap-2">
            <input
              type="text"
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
                joinRoom(joinCode.trim())
              }}
            >
              Unirme
            </button>
          </div>
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
  const remainingForSelf = self ? room.cards.length - self.discardedCardIds.length : room.cards.length
  const isMyTurn = room.phase === 'PLAYING' && room.activePlayerUserId === self?.userId
  const canAccuse = room.phase === 'PLAYING' && isMyTurn && remainingForSelf <= room.maxAccusationCount
  const winnerIsSelf = room.winnerUserId === user?.id
  const dealing = dealDeadline !== null && dealRemainingMs > 0

  return (
    <>
      <Modal onClose={handleExit} maxWidthClassName="max-w-[760px]">
      {dealing && <DealCountdownOverlay remainingMs={dealRemainingMs} />}

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] tracking-tight text-text-h">{room.gameTitle}</h2>
          <p className="flex items-center gap-1.5 text-[12.5px] text-text">
            Código de sala:
            <code className="text-[13px] font-semibold text-accent">{room.code}</code>
            <button
              type="button"
              className="text-text hover:text-accent"
              onClick={() => navigator.clipboard.writeText(room.code)}
              aria-label="Copiar código"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="relative flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
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
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
            onClick={handleExit}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Salir
          </button>
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

      {room.phase === 'WAITING' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-text-h">
              <Users className="h-4 w-4 text-accent" strokeWidth={2} />
              Jugadores en la sala ({room.players.length}/2)
            </p>
            <div className="flex flex-wrap gap-2">
              {room.players.map((player) => (
                <span
                  key={player.userId}
                  className="rounded-full border border-border bg-code-bg px-3 py-1.5 text-[12.5px] font-medium text-text-h"
                >
                  {player.displayName}
                  {player.isSelf ? ' (tú)' : ''}
                </span>
              ))}
            </div>
          </div>

          {room.players.length < 2 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-[13px] font-medium text-text-h">
                Comparte el código <strong className="text-accent">{room.code}</strong> con la otra
                persona para que se una.
              </p>
            </div>
          )}

          {self?.isHost ? (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="turn-duration-input">
                Segundos por turno
              </label>
              <input
                id="turn-duration-input"
                type="number"
                min={5}
                max={120}
                className="w-full rounded-lg border border-border bg-bg px-[13px] py-2 text-[14px] text-text-h outline-none focus:border-accent"
                value={turnDurationInput}
                onChange={(event) => setTurnDurationInput(Number(event.target.value))}
              />
              <p className="mt-1 text-[11.5px] text-text">
                Si nadie actúa a tiempo, el turno pasa automático. Entre 5 y 120 segundos.
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-text">
              Segundos por turno: <strong className="text-text-h">{turnDurationInput}</strong> (lo define
              quien creó la sala).
            </p>
          )}

          <button
            type="button"
            className="rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            disabled={room.players.length !== 2}
            onClick={() => startGame(turnDurationInput)}
          >
            {room.players.length === 2 ? 'Barajar y empezar' : 'Esperando al segundo jugador…'}
          </button>
        </div>
      )}

      {room.phase === 'PLAYING' && self && opponent && (
        <div className="flex flex-col gap-5">
          <TurnBanner
            isMyTurn={isMyTurn}
            opponentName={opponent.displayName}
            remainingMs={turnRemainingMs}
            turnDurationSeconds={room.turnDurationSeconds}
          />

          <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/5 p-4">
            <div>
              <p className="text-[11.5px] font-semibold tracking-wide text-accent uppercase">
                Tu tarjeta secreta (que el rival debe adivinar)
              </p>
              <p className="text-[15px] font-semibold text-text-h">
                {room.cards.find((card) => card.cardId === self.secretCardId)?.label ?? '—'}
              </p>
            </div>
            <span className="text-[12.5px] text-text">
              Quedan {remainingForSelf} de {room.cards.length}
            </span>
          </div>

          <div className={`grid grid-cols-3 gap-2.5 sm:grid-cols-4 ${!isMyTurn ? 'opacity-60' : ''}`}>
            {room.cards.map((card, index) => {
              const discarded = self.discardedCardIds.includes(card.cardId)
              const locked = !isMyTurn || discarded
              return (
                <button
                  key={card.cardId}
                  type="button"
                  disabled={locked}
                  className={`group relative overflow-hidden rounded-lg border text-left transition-[transform,border-color] duration-200 ${
                    discarded
                      ? 'border-border opacity-40 grayscale animate-[card-flip-out_0.4s_ease-in-out]'
                      : locked
                        ? 'cursor-not-allowed border-border'
                        : 'border-border hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_6px_16px_-8px_var(--accent)]'
                  }`}
                  style={{
                    animation: discarded
                      ? undefined
                      : `card-pop-in 0.3s ease-out ${Math.min(index, 12) * 0.03}s backwards`,
                  }}
                  onClick={() => !locked && discardCard(card.cardId)}
                >
                  <img src={card.imageUrl} alt="" className="h-20 w-full object-cover" />
                  <p className="truncate bg-surface px-1.5 py-1 text-[11px] font-medium text-text-h">
                    {card.label}
                  </p>
                  {card.audioUrl && (
                    <button
                      type="button"
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation()
                        new Audio(card.audioUrl as string).play().catch(() => {})
                      }}
                      aria-label={`Reproducir audio de ${card.label}`}
                    >
                      <Volume2 className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  )}
                </button>
              )
            })}
          </div>

          {isMyTurn && (
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 self-start rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-medium text-text-h transition-transform hover:-translate-y-0.5"
              onClick={passTurn}
            >
              <SkipForward className="h-3.5 w-3.5" strokeWidth={2} />
              Pasar turno
            </button>
          )}

          {canAccuse && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 animate-[fade-in-up_0.35s_ease-out]">
              <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-text-h">
                <Swords className="h-4 w-4 text-accent" strokeWidth={2} />
                Quedan {room.maxAccusationCount} o menos — ¿cuál crees que es la tarjeta de{' '}
                {opponent?.displayName}?
              </p>
              <button
                type="button"
                className={`rounded-lg border border-accent px-3.5 py-2 text-[12.5px] font-semibold text-accent transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${
                  !accusing ? 'animate-[result-glow-pulse_2s_ease-in-out_infinite]' : ''
                }`}
                onClick={() => setAccusing((current) => !current)}
              >
                {accusing ? 'Cancelar acusación' : 'Acusar una tarjeta'}
              </button>
              {accusing && (
                <p className="mt-2 text-[12px] text-text animate-[fade-in-up_0.2s_ease-out]">
                  Toca la tarjeta correspondiente arriba para confirmar tu acusación.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {room.phase === 'PLAYING' && accusing && self && (
        <AccusationOverlay
          cards={room.cards}
          discardedCardIds={self.discardedCardIds}
          onCancel={() => setAccusing(false)}
          onAccuse={(cardId) => {
            accuseCard(cardId)
            setAccusing(false)
          }}
        />
      )}

      {room.phase === 'FINISHED' && opponent && self && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full text-white animate-[trophy-pop-in_0.5s_cubic-bezier(0.16,1,0.3,1)]"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            <Trophy className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <p className="text-[18px] font-semibold text-text-h animate-[fade-in-up_0.4s_ease-out_0.1s_backwards]">
            {winnerIsSelf ? '¡Ganaste!' : `Ganó ${room.players.find((p) => p.userId === room.winnerUserId)?.displayName}`}
          </p>
          <p className="text-[13px] text-text animate-[fade-in-up_0.4s_ease-out_0.2s_backwards]">
            La tarjeta secreta de {opponent.displayName} era{' '}
            <strong className="text-text-h">
              {room.cards.find((card) => card.cardId === opponent.secretCardId)?.label}
            </strong>
            .
          </p>

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
 * Panel de chat de la sala: flota sobre el modal del juego para que los dos
 * jugadores puedan coordinarse por texto sin llamada ni estar en persona.
 * No guarda historial en el servidor — solo lo que llegó mientras el socket
 * de este cliente estuvo conectado a la sala.
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

/**
 * Cuenta regresiva 3-2-1 antes de repartir cartas nuevas (inicio o
 * revancha): mientras baja el número, dos cartas boca abajo "vuelan" desde
 * el centro — una hacia el jugador (self) que se voltea y revela su nombre,
 * y otra hacia el rival que se queda boca abajo, dejando claro que cada
 * quien solo conoce su propia carta secreta.
 */
function DealCountdownOverlay({ remainingMs }: { remainingMs: number }) {
  const secondsLeft = Math.ceil(remainingMs / 1000)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-black/70 backdrop-blur-sm animate-[modal-backdrop-in_0.2s_ease-out]">
      <div className="flex items-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-20 w-14 items-center justify-center rounded-lg border-2 border-white/30 bg-gradient-to-br from-white/20 to-white/5 shadow-lg animate-[deal-card-to-opponent_0.6s_ease-out_backwards]"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="text-[10px] font-semibold tracking-widest text-white/50 uppercase">Rival</span>
          </div>
          <p className="text-[11px] font-medium text-white/60">Carta oculta</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-20 w-14 items-center justify-center rounded-lg border-2 border-accent bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_60%,white)] to-[var(--accent)] text-center shadow-[0_8px_20px_-6px_var(--accent)] [backface-visibility:hidden] animate-[deal-card-to-self_0.7s_ease-out_backwards]"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="px-1 text-[10px] font-semibold text-white">Tú</span>
          </div>
          <p className="text-[11px] font-medium text-white/60">Tu carta se revela primero</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-[14px] font-medium tracking-wide text-white/80 uppercase">Barajando cartas…</p>
        <span
          key={secondsLeft}
          className="text-[72px] font-bold text-white animate-[countdown-number-pulse_1s_ease-out]"
        >
          {secondsLeft > 0 ? secondsLeft : '¡Ya!'}
        </span>
      </div>
    </div>
  )
}

/** Banner que muestra de quién es el turno y cuánto tiempo le queda antes del auto-pase. */
function TurnBanner({
  isMyTurn,
  opponentName,
  remainingMs,
  turnDurationSeconds,
}: {
  isMyTurn: boolean
  opponentName: string
  remainingMs: number
  turnDurationSeconds: number
}) {
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const progress = Math.max(0, Math.min(1, remainingMs / (turnDurationSeconds * 1000)))
  const urgent = secondsLeft <= 5

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
        isMyTurn
          ? 'border-accent/50 bg-accent/10 animate-[turn-banner-glow_2s_ease-in-out_infinite]'
          : 'border-border bg-code-bg'
      }`}
    >
      <p className="text-[13.5px] font-semibold text-text-h">
        {isMyTurn ? 'Es tu turno' : `Turno de ${opponentName}`}
      </p>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
              urgent ? 'bg-danger' : 'bg-accent'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={`w-5 text-right text-[13px] font-semibold tabular-nums ${urgent ? 'text-danger' : 'text-text-h'}`}>
          {secondsLeft}
        </span>
      </div>
    </div>
  )
}

function AccusationOverlay({
  cards,
  discardedCardIds,
  onCancel,
  onAccuse,
}: {
  cards: { cardId: string; imageUrl: string; label: string }[]
  discardedCardIds: string[]
  onCancel: () => void
  onAccuse: (cardId: string) => void
}) {
  const remaining = cards.filter((card) => !discardedCardIds.includes(card.cardId))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm animate-[modal-backdrop-in_0.2s_ease-out]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] animate-[accusation-overlay-pop-in_0.25s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-4 text-[16px] font-semibold text-text-h">Elige la tarjeta del rival</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {remaining.map((card, index) => (
            <button
              key={card.cardId}
              type="button"
              className="overflow-hidden rounded-lg border border-border text-left transition-transform hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_6px_16px_-8px_var(--accent)]"
              style={{ animation: `card-pop-in 0.25s ease-out ${index * 0.03}s backwards` }}
              onClick={() => onAccuse(card.cardId)}
            >
              <img src={card.imageUrl} alt="" className="h-16 w-full object-cover" />
              <p className="truncate bg-surface px-1.5 py-1 text-[10.5px] font-medium text-text-h">
                {card.label}
              </p>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-text-h transition-transform hover:-translate-y-0.5"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
