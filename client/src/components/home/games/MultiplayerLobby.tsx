import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Copy, Link, LogOut, MessageCircle, Users } from 'lucide-react'
import { Modal } from './Modal'
import { LobbyReadyControl } from './LobbyReadyControl'
import { ChatPanel } from './ChatPanel'
import type { GuessWhoChatMessage } from './guessWhoTypes'

type LobbyPlayer = {
  userId: string
  displayName: string
  isSelf: boolean
  ready?: boolean
  role?: string
}
type Props = {
  room: { gameTitle: string; code: string; players: LobbyPlayer[] }
  roomPath: string
  maxPlayers: number
  isHost: boolean
  connecting: boolean
  error: string | null
  turnDurationSeconds?: number
  minTurn?: number
  maxTurn?: number
  requireEven?: boolean
  onUpdateTurnDuration?: (seconds: number) => void
  onReady: (ready: boolean) => void
  onExit: () => void
  messages: GuessWhoChatMessage[]
  onSend: (text: string) => void
  children?: ReactNode
}

/** Única sala de espera: estructura y estilos extraídos del lobby de Banderas. */
export function MultiplayerLobby({
  room,
  roomPath,
  maxPlayers,
  isHost,
  connecting,
  error,
  turnDurationSeconds,
  minTurn = 5,
  maxTurn = 120,
  requireEven = false,
  onUpdateTurnDuration,
  onReady,
  onExit,
  messages,
  onSend,
  children,
}: Props) {
  const [chatOpen, setChatOpen] = useState(false)
  const [readCount, setReadCount] = useState(messages.length)
  const unreadCount = Math.max(0, messages.length - readCount)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [turnDurationText, setTurnDurationText] = useState(
    String(turnDurationSeconds ?? ''),
  )
  const [previousDuration, setPreviousDuration] = useState(turnDurationSeconds)
  if (previousDuration !== turnDurationSeconds) {
    setPreviousDuration(turnDurationSeconds)
    setTurnDurationText(String(turnDurationSeconds ?? ''))
  }
  const durationId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    containerRef.current?.querySelector<HTMLElement>('h2')?.focus()
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      previous?.focus()
    }
  }, [])
  async function copyValue(value: string, feedback: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyFeedback(feedback)
    } catch {
      setCopyFeedback('No se pudo copiar. Inténtalo de nuevo.')
    }
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopyFeedback(null), 1800)
  }
  function closeChat() {
    setChatOpen(false)
    setReadCount(messages.length)
    containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }
  return (
    <div
      ref={containerRef}
      data-lobby="shared"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const scope = chatOpen
          ? containerRef.current?.querySelector(
              '[aria-label="Chat de la sala"]',
            )
          : containerRef.current
        const controls = Array.from(
          scope?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled)',
          ) ?? [],
        )
        const first = controls[0],
          last = controls[controls.length - 1]
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !controls.includes(document.activeElement as HTMLElement))
        ) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <Modal
        onClose={chatOpen ? closeChat : onExit}
        maxWidthClassName="max-w-[840px]"
        ariaLabel="Sala de espera"
        ariaModal={!chatOpen}
      >
        {children}
        <div className="mb-5 rounded-[24px] border border-border/80 bg-gradient-to-r from-accent/8 via-surface to-bg p-4 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                Sala activa
              </p>
              <h2
                tabIndex={-1}
                className="mt-1 text-[22px] font-bold tracking-tight text-text-h"
              >
                {room.gameTitle}
              </h2>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="relative flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
                onClick={() => {
                  setChatOpen((current) => !current)
                  setReadCount(messages.length)
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
                onClick={onExit}
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
                onClick={() => copyValue(room.code, 'Código copiado')}
              >
                <Copy className="h-3 w-3" strokeWidth={2} />
                Copiar código
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/20"
                onClick={() =>
                  copyValue(
                    new URL(roomPath, window.location.origin).href,
                    'Enlace copiado',
                  )
                }
              >
                <Link className="h-3 w-3" strokeWidth={2} />
                Copiar enlace
              </button>
              {copyFeedback && (
                <span
                  className="text-[11px] font-medium text-accent"
                  role="status"
                >
                  {copyFeedback}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-border bg-gradient-to-br from-bg to-surface p-4 shadow-[var(--shadow)]">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-text-h">
              <Users className="h-4 w-4 text-accent" strokeWidth={2} />
              Jugadores en la sala ({room.players.length}/{maxPlayers})
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {room.players.map((player) => (
                <span
                  key={player.userId}
                  className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-[12.5px] font-medium text-text-h"
                >
                  {player.role === 'FIRE'
                    ? '🔥 '
                    : player.role === 'WATER'
                      ? '💧 '
                      : ''}
                  {player.displayName}
                  {player.isSelf ? ' (tú)' : ''}
                </span>
              ))}
            </div>
          </div>

          {turnDurationSeconds === undefined ? (
            <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
              <p className="text-[13px] font-medium text-text-h">
                Juego simultáneo
              </p>
              <p className="mt-1 text-[12.5px] text-text">
                Fuego y Agua colaboran al mismo tiempo. Esta actividad no usa
                turnos.
              </p>
            </div>
          ) : isHost ? (
            <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
              <label
                className="mb-1.5 block text-[13px] font-medium text-text-h"
                htmlFor={durationId}
              >
                Segundos por turno
              </label>
              <input
                id={durationId}
                type="number"
                min={minTurn}
                max={maxTurn}
                className="w-full rounded-xl border border-border bg-bg px-[13px] py-2.5 text-[14px] text-text-h outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
                disabled={connecting}
                value={turnDurationText}
                onChange={(event) => {
                  const raw = event.target.value
                  setTurnDurationText(raw)
                  const parsed = Number(raw)
                  if (
                    raw.trim() !== '' &&
                    Number.isInteger(parsed) &&
                    parsed >= minTurn &&
                    parsed <= maxTurn
                  ) {
                    onUpdateTurnDuration?.(parsed)
                  }
                }}
              />
              <p className="mt-1 text-[11.5px] text-text">
                Si nadie actúa a tiempo, el turno pasa automático. Entre{' '}
                {minTurn} y {maxTurn} segundos.
              </p>
            </div>
          ) : (
            <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
              <p className="text-[12.5px] text-text">
                Segundos por turno:{' '}
                <strong className="text-text-h">{turnDurationText}</strong> (lo
                define quien creó la sala).
              </p>
            </div>
          )}

          <LobbyReadyControl
            players={room.players}
            onReady={onReady}
            disconnected={connecting}
            requireEven={requireEven}
          />
        </div>
      </Modal>
      {chatOpen && (
        <ChatPanel
          messages={messages}
          selfUserId={room.players.find((p) => p.isSelf)?.userId ?? null}
          onClose={closeChat}
          onSend={onSend}
          disconnected={connecting}
          modal
        />
      )}
    </div>
  )
}
