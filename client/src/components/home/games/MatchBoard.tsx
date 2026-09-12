import { useEffect, useState } from 'react'
import { Clock3, SkipForward, Swords, Volume2 } from 'lucide-react'
import type { GuessWhoCard, RoomPlayerView } from './guessWhoTypes'

/**
 * Cuenta el tiempo restante hasta `deadline` (epoch ms) y se refresca cada
 * 200ms. Compartido entre la sala 1v1 y los matches de torneo.
 */
export function useCountdown(deadline: number | null): number {
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

/**
 * Reloj compacto de tiempo restante del turno. El deadline sigue viniendo del
 * servidor; solo cambia la representación visual de la cuenta regresiva.
 */
export function TurnBanner({
  isMyTurn,
  remainingMs,
  turnDurationSeconds,
}: {
  isMyTurn: boolean
  remainingMs: number
  turnDurationSeconds: number
}) {
  const secondsLeft = Math.ceil(remainingMs / 1000)
  const urgent = secondsLeft <= 5
  const clockProgress = Math.max(0, Math.min(1, remainingMs / (turnDurationSeconds * 1000)))
  const circumference = 2 * Math.PI * 22

  return (
    <div
      className={`flex items-center justify-end gap-3 rounded-xl border p-3 transition-colors ${
        isMyTurn ? 'border-accent/50 bg-accent/10' : 'border-border bg-code-bg'
      }`}
    >
      <span className="sr-only">{isMyTurn ? 'Es tu turno' : 'Turno del rival'}</span>
      <div className="relative flex h-14 w-14 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="22" fill="none" className="stroke-border" strokeWidth="4" />
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            className={urgent ? 'stroke-danger' : 'stroke-accent'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clockProgress)}
          />
        </svg>
        <Clock3 className={`h-4 w-4 ${urgent ? 'text-danger' : 'text-accent'}`} strokeWidth={2} />
        <span className={`absolute text-[11px] font-bold tabular-nums ${urgent ? 'text-danger' : 'text-text-h'}`}>
          {secondsLeft}
        </span>
      </div>
      <span className="text-[12px] font-medium text-text">{isMyTurn ? 'Tu turno' : 'Turno del rival'}</span>
    </div>
  )
}

/**
 * Aviso de cambio de turno como mensaje "pop" centrado en pantalla, en vez
 * del texto fijo que antes vivía arriba del todo — pedido explícito para que
 * sea más intuitivo notar de quién es el turno. Aparece con cada cambio de
 * `isMyTurn` (en una sala 1v1 solo hay dos jugadores, así que cualquier
 * cambio de este booleano es, por definición, un cambio de turno) y se
 * autooculta solo; `pointer-events-none` para no bloquear ningún clic
 * mientras está en pantalla.
 */
export function TurnPopBanner({ isMyTurn, opponentName }: { isMyTurn: boolean; opponentName: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
    const timeout = setTimeout(() => setVisible(false), 1700)
    return () => clearTimeout(timeout)
  }, [isMyTurn])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center p-5">
      <div
        className={`rounded-2xl border px-8 py-5 text-center shadow-[var(--shadow)] backdrop-blur-sm animate-[turn-pop-in_0.35s_cubic-bezier(0.16,1,0.3,1),turn-pop-out_0.3s_ease-in_1.35s_forwards] ${
          isMyTurn ? 'border-accent/50 bg-accent/15' : 'border-border bg-surface/95'
        }`}
      >
        <p className={`text-[22px] font-bold tracking-tight ${isMyTurn ? 'text-accent' : 'text-text-h'}`}>
          {isMyTurn ? '¡Es tu turno!' : `Turno de ${opponentName}`}
        </p>
      </div>
    </div>
  )
}

/** Cuenta regresiva 3-2-1 antes de repartir cartas nuevas (inicio o revancha de una sala 1v1). */
export function DealCountdownOverlay({ remainingMs }: { remainingMs: number }) {
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

export function AccusationOverlay({
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

type MatchBoardProps = {
  cards: GuessWhoCard[]
  self: RoomPlayerView
  opponent: RoomPlayerView
  isMyTurn: boolean
  canAccuse: boolean
  turnDeadline: number | null
  turnDurationSeconds: number
  onDiscard: (cardId: string) => void
  onAccuse: (cardId: string) => void
  onPassTurn: () => void
}

/**
 * Tablero de una partida 1v1 de "¿Quién Es?" en curso (fase PLAYING):
 * banner de turno, tarjeta secreta propia, grilla de descarte, botón de
 * pasar turno y bloque de acusación. Compartido entre la sala 1v1 suelta
 * (GuessWhoRoom) y cada match de una ronda de torneo (TournamentRoom) — es
 * la misma mecánica de juego, solo cambia de dónde vienen los eventos.
 */
export function MatchBoard({
  cards,
  self,
  opponent,
  isMyTurn,
  canAccuse,
  turnDeadline,
  turnDurationSeconds,
  onDiscard,
  onAccuse,
  onPassTurn,
}: MatchBoardProps) {
  const [accusing, setAccusing] = useState(false)
  const turnRemainingMs = useCountdown(turnDeadline)
  const remainingForSelf = cards.length - self.discardedCardIds.length
  const minimumDiscardsReached = self.discardedCardIds.length >= 2

  return (
    <div className="flex flex-col gap-5">
      <TurnPopBanner isMyTurn={isMyTurn} opponentName={opponent.displayName} />
      <TurnBanner isMyTurn={isMyTurn} remainingMs={turnRemainingMs} turnDurationSeconds={turnDurationSeconds} />

      {/* Acciones a la izquierda, tablero de cartas a la derecha: agrupa lo
          que se puede HACER en un solo lugar fijo (acusar, pasar turno) en
          vez de mezclarlo entre las cartas y el pie de página — pedido
          explícito para que el juego se sienta más intuitivo. En pantallas
          angostas se apila arriba de las cartas en vez de al lado. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col gap-3 sm:w-[190px]">
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5">
            <p className="text-[10.5px] font-semibold tracking-wide text-accent uppercase">Tu tarjeta secreta</p>
            <p className="mt-0.5 text-[14px] font-semibold text-text-h">
              {cards.find((card) => card.cardId === self.secretCardId)?.label ?? '—'}
            </p>
            <p className="mt-1.5 text-[11.5px] text-text">
              Quedan {remainingForSelf} de {cards.length}
            </p>
          </div>

          {isMyTurn && (
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-[12.5px] font-medium text-text-h transition-transform hover:-translate-y-0.5"
              onClick={onPassTurn}
            >
              <SkipForward className="h-3.5 w-3.5" strokeWidth={2} />
              Pasar turno
            </button>
          )}

          {isMyTurn && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5 animate-[fade-in-up_0.35s_ease-out]">
              <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-text-h">
                <Swords className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
                ¿Cuál crees que es la tarjeta de {opponent.displayName}?
              </p>
              {!minimumDiscardsReached && (
                <p className="mb-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-[11.5px] text-text" role="status">
                  Puedes acusar a tu rival después de descartar mínimo dos cartas.
                </p>
              )}
              <button
                type="button"
                disabled={!canAccuse}
                className={`w-full rounded-lg border border-accent px-3 py-2 text-[12px] font-semibold text-accent transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${
                  !accusing ? 'animate-[result-glow-pulse_2s_ease-in-out_infinite]' : ''
                }`}
                onClick={() => setAccusing((current) => !current)}
              >
                {accusing ? 'Cancelar acusación' : 'Acusar carta'}
              </button>
              {accusing && (
                <p className="mt-2 text-[11px] text-text animate-[fade-in-up_0.2s_ease-out]">
                  Toca la tarjeta correspondiente para confirmar.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`grid flex-1 grid-cols-3 gap-2.5 sm:grid-cols-4 ${!isMyTurn ? 'opacity-60' : ''}`}>
          {cards.map((card, index) => {
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
                )}

                {accusing && (
                <img src={card.imageUrl} alt="" className="h-20 w-full object-cover" />
                <p className="truncate bg-surface px-1.5 py-1 text-[11px] font-medium text-text-h">{card.label}</p>
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
      </div>

      {accusing && (
        <AccusationOverlay
          cards={cards}
          discardedCardIds={self.discardedCardIds}
          onCancel={() => setAccusing(false)}
          onAccuse={(cardId) => {
            onAccuse(cardId)
            setAccusing(false)
          }}
        />
      )}
    </div>
  )
}
