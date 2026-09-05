import { useState } from 'react'
import { Copy, LogOut, Swords, Trophy, Users, Volume2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useGuessWhoRoom } from './useGuessWhoRoom'
import { Modal } from './Modal'

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
    createRoom,
    joinRoom,
    startGame,
    discardCard,
    accuseCard,
    voteRematch,
    leaveRoom,
  } = useGuessWhoRoom(token)
  const [entryChoice, setEntryChoice] = useState<EntryChoice>('undecided')
  const [joinCode, setJoinCode] = useState('')
  const [accusing, setAccusing] = useState(false)

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
  const canAccuse = room.phase === 'PLAYING' && remainingForSelf <= room.maxAccusationCount
  const winnerIsSelf = room.winnerUserId === user?.id

  return (
    <Modal onClose={handleExit} maxWidthClassName="max-w-[760px]">
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

          <button
            type="button"
            className="rounded-lg px-4 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            disabled={room.players.length !== 2}
            onClick={startGame}
          >
            {room.players.length === 2 ? 'Barajar y empezar' : 'Esperando al segundo jugador…'}
          </button>
        </div>
      )}

      {room.phase === 'PLAYING' && self && (
        <div className="flex flex-col gap-5">
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

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {room.cards.map((card, index) => {
              const discarded = self.discardedCardIds.includes(card.cardId)
              return (
                <button
                  key={card.cardId}
                  type="button"
                  className={`group relative overflow-hidden rounded-lg border text-left transition-[transform,border-color] duration-200 ${
                    discarded
                      ? 'border-border opacity-40 grayscale animate-[card-flip-out_0.4s_ease-in-out]'
                      : 'border-border hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_6px_16px_-8px_var(--accent)]'
                  }`}
                  style={{
                    animation: discarded
                      ? undefined
                      : `card-pop-in 0.3s ease-out ${Math.min(index, 12) * 0.03}s backwards`,
                  }}
                  onClick={() => !discarded && discardCard(card.cardId)}
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
                  onClick={() => voteRematch(false)}
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
