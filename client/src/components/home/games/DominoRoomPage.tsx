import { LobbyReadyControl } from './LobbyReadyControl'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, Copy, LogOut, RotateCcw, Trophy, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useDominoRoom } from './useDominoRoom'
import { iconForConcept, type DominoConcept } from './dominoTypes'
import type { DominoPlacedTileView, DominoTileView } from './dominoRoomTypes'
import { DealCountdownOverlay, TurnBanner, TurnPopBanner, useCountdown } from './MatchBoard'
import { Modal } from './Modal'

/**
 * Sala de Dominó 1v1 en tiempo real: página propia (ruta `/domino/sala/:code?`,
 * ver App.tsx) en vez de un pop-up, para que se pueda compartir/recargar el
 * link de una partida en curso — mismo criterio que se usó para "¿Quién Es?"
 * salvo que ahí la sala vive fuera del árbol de rutas; acá el pedido explícito
 * fue una página dedicada, así que sí es una <Route>.
 */
export function DominoRoomPage() {
  const { code: codeFromUrl } = useParams<{ code?: string }>()
  const [searchParams] = useSearchParams()
  const gameIdToCreate = searchParams.get('gameId')
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const {
    room,
    error,
    connecting,
    rematchRejectedMessage,
    dealCountdownMs,
    lastPlacedTileId,
    createRoom,
    joinRoom,
    setReady,
    updateTurnDuration,
    playTile,
    drawTile,
    passTurn,
    voteRematch,
    leaveRoom,
  } = useDominoRoom(token)

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [turnDurationText, setTurnDurationText] = useState('')
  const [instructionsAccepted, setInstructionsAccepted] = useState(false)
  const [boardScale, setBoardScale] = useState(1)
  const [draggedTileId, setDraggedTileId] = useState<string | null>(null)
  const boardViewportRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const remainingMs = useCountdown(room?.turnDeadline ?? null)

  // Arranque de la sala: si la URL trae ?gameId= crea una sala nueva; si trae
  // un código en el path, se une a esa sala. Se hace una sola vez (guard con
  // startedRef) para no reintentar en cada re-render del hook de socket.
  useEffect(() => {
    if (connecting || startedRef.current || !instructionsAccepted) return
    if (codeFromUrl) {
      startedRef.current = true
      joinRoom(codeFromUrl.toUpperCase())
    } else if (gameIdToCreate) {
      startedRef.current = true
      createRoom(gameIdToCreate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, codeFromUrl, gameIdToCreate, instructionsAccepted])

  // En cuanto el servidor confirma el código de una sala recién creada, se
  // refleja en la URL vía react-router (reemplazando, sin agregar historial)
  // para que la sala sea compartible/recargable con ese link.
  useEffect(() => {
    if (room && !codeFromUrl) {
      navigate(`/domino/sala/${room.code}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  function handleExit() {
    leaveRoom()
    navigate('/')
  }

  function handleCopyCode() {
    if (!room) return
    void navigator.clipboard.writeText(room.code).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 1500)
    })
  }

  function handleJoinSubmit() {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    startedRef.current = true
    joinRoom(code)
  }

  const self = room?.players.find((p) => p.isSelf)
  const opponent = room?.players.find((p) => !p.isSelf)
  const isHostSelf = Boolean(self?.isHost)
  const isMyTurn = room?.phase === 'PLAYING' && room.activePlayerUserId === user?.id
  const conceptOf = (id: number): DominoConcept => room!.concepts[id]

  const board = room?.board ?? []
  const leftEnd = board[0]?.left
  const rightEnd = board[board.length - 1]?.right
  const hand: DominoTileView[] = self?.hand ?? []

  function tileMatchesEnd(tile: DominoTileView, end: number | undefined): boolean {
    if (end === undefined) return true
    return tile.a === end || tile.b === end
  }

  const hasValidMove =
    board.length === 0 ? hand.length > 0 : hand.some((t) => tileMatchesEnd(t, leftEnd) || tileMatchesEnd(t, rightEnd))

  const selectedTile = hand.find((t) => t.id === selectedTileId) ?? null
  const canPlaceLeft = selectedTile ? tileMatchesEnd(selectedTile, leftEnd) : false
  const canPlaceRight = selectedTile ? tileMatchesEnd(selectedTile, rightEnd) : false

  useEffect(() => {
    const viewport = boardViewportRef.current
    if (!viewport) return

    const updateScale = () => {
      if (!board.length) {
        setBoardScale(1)
        return
      }
      const availableWidth = viewport.clientWidth - 24
      const estimatedWidth = board.length * 136 + 80
      setBoardScale(Math.min(1, Math.max(0.1, availableWidth / estimatedWidth)))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [board.length])

  useEffect(() => {
    if (room?.turnDurationSeconds === undefined) return
    setTurnDurationText(String(room.turnDurationSeconds))
  }, [room?.code])

  useEffect(() => {
    if (isHostSelf || room?.turnDurationSeconds === undefined) return
    setTurnDurationText(String(room.turnDurationSeconds))
  }, [room?.turnDurationSeconds, isHostSelf])

  useEffect(() => {
    if (!rematchRejectedMessage) return
    const timeout = setTimeout(() => navigate('/'), 2800)
    return () => clearTimeout(timeout)
  }, [rematchRejectedMessage, navigate])

  function handleHandTileClick(tile: DominoTileView) {
    if (!isMyTurn) return
    if (selectedTileId === tile.id) {
      setSelectedTileId(null)
      return
    }
    if (board.length === 0) {
      playTile(tile.id, 'right')
      return
    }
    setSelectedTileId(tile.id)
  }

  function handleEndClick(side: 'left' | 'right') {
    const tileId = selectedTileId ?? draggedTileId
    if (!tileId) return
    playTile(tileId, side)
    setSelectedTileId(null)
    setDraggedTileId(null)
  }

  function handleRematchDecline() {
    voteRematch(false)
    navigate('/')
  }

  if (!instructionsAccepted) {
    return <DominoInstructionsModal onContinue={() => setInstructionsAccepted(true)} />
  }

  if (rematchRejectedMessage) {
    return (
      <Modal onClose={() => navigate('/')} maxWidthClassName="max-w-[420px]">
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
            onClick={() => navigate('/')}
          >
            Entendido
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      {dealCountdownMs !== null && <DealCountdownOverlay remainingMs={dealCountdownMs} />}

      <div className="mx-auto flex min-h-full max-w-[1040px] flex-col p-5 sm:p-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">
              {room?.gameTitle ?? 'Dominó'}
            </p>
            <h1 className="text-[20px] tracking-tight text-text-h">Sala en vivo</h1>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
            onClick={handleExit}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Salir
          </button>
        </header>

        {error && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
            {error}
          </p>
        )}
        {rematchRejectedMessage && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-[13px] text-danger">
            {rematchRejectedMessage}
          </p>
        )}

        {!room && !codeFromUrl && !gameIdToCreate && (
          <div className="mx-auto flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
            <p className="text-[14px] text-text-h">Ingresa el código de una sala de dominó para unirte:</p>
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
          </div>
        )}

        {!room && (codeFromUrl || gameIdToCreate) && (
          <p className="py-10 text-center text-[14px] text-text">Conectando a la sala…</p>
        )}

        {room && room.phase === 'WAITING' && (
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
            <div className="rounded-[24px] border border-border bg-gradient-to-r from-accent/8 via-surface to-bg p-4 shadow-[var(--shadow)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Sala activa</p>
                  <h2 className="mt-1 text-[22px] font-bold tracking-tight text-text-h">{room.gameTitle}</h2>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-h transition-colors hover:border-accent/50 hover:text-accent"
                  onClick={handleExit}
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                  Salir
                </button>
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
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg px-2.5 py-1.5 text-[11px] font-medium text-text-h transition-colors hover:border-accent hover:text-accent"
                  >
                    <Copy className="h-3 w-3" strokeWidth={2} />
                    Copiar código
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/20"
                    onClick={() => {
                      if (!room) return
                      const url = new URL(window.location.href)
                      url.searchParams.set('sala', room.code)
                      void navigator.clipboard.writeText(url.toString()).then(() => {
                        setCopyFeedback(true)
                        setTimeout(() => setCopyFeedback(false), 1500)
                      })
                    }}
                  >
                    <Copy className="h-3 w-3" strokeWidth={2} />
                    Copiar enlace
                  </button>
                  {copyFeedback && <span className="text-[11px] font-medium text-accent" role="status">¡Copiado!</span>}
                </div>
              </div>
            </div>

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
                    {player.isHost ? ' (anfitrión)' : ''}
                    {player.userId === user?.id ? ' (tú)' : ''}
                  </span>
                ))}
              </div>
            </div>

            {isHostSelf ? (
              <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
                <label className="mb-1.5 block text-[13px] font-medium text-text-h" htmlFor="domino-turn-duration-input">
                  Segundos por turno
                </label>
                <input
                  id="domino-turn-duration-input"
                  type="number"
                  min={5}
                  max={120}
                  value={turnDurationText}
                  onChange={(event) => {
                    const raw = event.target.value
                    setTurnDurationText(raw)
                    const parsed = Number(raw)
                    if (raw.trim() !== '' && Number.isInteger(parsed) && parsed >= 5 && parsed <= 120) {
                      updateTurnDuration(parsed)
                    }
                  }}
                  className="w-full rounded-xl border border-border bg-bg px-[13px] py-2.5 text-[14px] text-text-h outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
                <p className="mt-1 text-[11.5px] text-text">
                  Si nadie actúa a tiempo, el turno pasa automático. Entre 5 y 120 segundos.
                </p>
              </div>
            ) : (
              <div className="rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow)]">
                <p className="text-[12.5px] text-text">
                  Segundos por turno: <strong className="text-text-h">{turnDurationText}</strong> (lo define quien creó la sala).
                </p>
              </div>
            )}

            <LobbyReadyControl players={room.players} onReady={setReady} disconnected={connecting} />
          </div>
        )}

        {room && room.phase === 'PLAYING' && opponent && (
          <div className="flex flex-col gap-5">
            <TurnPopBanner isMyTurn={isMyTurn} opponentName={opponent.displayName} />
            <TurnBanner isMyTurn={isMyTurn} remainingMs={remainingMs} turnDurationSeconds={room.turnDurationSeconds} />

            <div className="flex items-center justify-between text-[12.5px] text-text">
              <span>
                {opponent.displayName}: <strong className="text-text-h">{opponent.handCount}</strong> ficha
                {opponent.handCount === 1 ? '' : 's'}
              </span>
              <span>
                Pozo: <strong className="text-text-h">{room.boneyardCount}</strong>
              </span>
            </div>

            {/* Tablero */}
            <div ref={boardViewportRef} className="overflow-hidden rounded-xl border border-border bg-code-bg p-3 sm:p-4">
              {board.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-text">
                  {isMyTurn ? 'Toca una ficha de tu mano para abrir la partida.' : 'Esperando la primera jugada…'}
                </p>
              ) : (
                <div className="flex min-h-[82px] items-center justify-center overflow-hidden">
                  <div
                    className="flex w-max items-center gap-2"
                    style={{ transform: `scale(${boardScale})`, transformOrigin: 'center center' }}
                  >
                    <EndDropZone
                      active={isMyTurn && Boolean(selectedTile) && canPlaceLeft}
                      onClick={() => handleEndClick('left')}
                      onDrop={() => handleEndClick('left')}
                    />
                    {board.map((placed) => (
                      <BoardTileView
                        key={placed.id}
                        placed={placed}
                        conceptOf={conceptOf}
                        justPlaced={placed.id === lastPlacedTileId}
                      />
                    ))}
                    <EndDropZone
                      active={isMyTurn && Boolean(selectedTile) && canPlaceRight}
                      onClick={() => handleEndClick('right')}
                      onDrop={() => handleEndClick('right')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Acciones: robar / pasar, solo tienen efecto en tu turno */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isMyTurn || room.boneyardCount === 0 || hasValidMove}
                onClick={drawTile}
              >
                Robar del pozo
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isMyTurn || room.boneyardCount > 0 || hasValidMove}
                onClick={passTurn}
              >
                Pasar turno
              </button>
            </div>

            {/* Mano propia — fichas grandes y visualmente diferenciadas por
                concepto (ícono + color propios), animadas al entrar/jugar. */}
            <div>
              <p className="mb-3 text-[11.5px] font-semibold tracking-wide text-text/70 uppercase">
                Tu mano ({hand.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {hand.map((tile) => {
                  const playable = board.length === 0 || tileMatchesEnd(tile, leftEnd) || tileMatchesEnd(tile, rightEnd)
                  return (
                    <HandTileView
                      key={tile.id}
                      tile={tile}
                      selected={selectedTileId === tile.id}
                      state={!isMyTurn ? 'waiting' : selectedTileId === tile.id ? 'selected' : playable ? 'playable' : 'unavailable'}
                      conceptOf={conceptOf}
                      onClick={() => handleHandTileClick(tile)}
                      onDragStart={() => {
                        setDraggedTileId(tile.id)
                        setSelectedTileId(tile.id)
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {room && room.phase === 'FINISHED' && opponent && self && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-white animate-[trophy-pop-in_0.5s_cubic-bezier(0.16,1,0.3,1)]"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Trophy className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[18px] font-semibold text-text-h animate-[fade-in-up_0.4s_ease-out_0.1s_backwards]">
              {room.winnerUserId === null
                ? 'Empate — bloqueo con las mismas fichas'
                : room.winnerUserId === user?.id
                  ? '¡Ganaste!'
                  : `Ganó ${opponent.displayName}`}
            </p>
            <p className="text-[13px] text-text animate-[fade-in-up_0.4s_ease-out_0.2s_backwards]">
              {room.endedByBlock
                ? 'La partida se bloqueó: nadie tenía jugada posible.'
                : 'Se quedó sin fichas primero.'}
            </p>

            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-[12.5px] text-text">
                {self.hasVotedRematch
                  ? 'Esperando a que el rival acepte la revancha…'
                  : '¿Quieres una revancha?'}
              </p>
              {!self.hasVotedRematch && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)]"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                    onClick={() => voteRematch(true)}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Revancha
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
                    onClick={handleRematchDecline}
                  >
                    No, gracias
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConceptHalf({ concept, size = 'md' }: { concept: DominoConcept; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = iconForConcept(concept.icon)
  const sizing =
    size === 'lg' ? 'px-2 py-3.5 gap-1.5' : size === 'sm' ? 'px-1.5 py-2 gap-1' : 'px-1.5 py-2.5 gap-1'
  const iconSize = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-4.5 w-4.5' : 'h-6 w-6'
  const textSize = size === 'lg' ? 'text-[11px]' : size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center ${sizing}`}
      style={{ background: `color-mix(in srgb, ${concept.color} 10%, transparent)` }}
    >
      <Icon className={iconSize} style={{ color: concept.color }} strokeWidth={2} />
      <span className={`text-center leading-tight font-semibold text-text-h ${textSize}`}>{concept.label}</span>
    </div>
  )
}

/** Fichas más grandes que el modo un-jugador, y con la animación "recién jugada" al colocarse. */
function BoardTileView({
  placed,
  conceptOf,
  justPlaced,
}: {
  placed: DominoPlacedTileView
  conceptOf: (id: number) => DominoConcept
  justPlaced: boolean
}) {
  const animation = justPlaced ? 'animate-[domino-tile-play-in_0.35s_cubic-bezier(0.16,1,0.3,1)_backwards]' : ''
  if (placed.isDouble) {
    return (
      <div
        className={`flex h-[124px] w-[68px] shrink-0 flex-col overflow-hidden rounded-lg border-[3px] border-border bg-surface shadow-[var(--shadow)] ${animation}`}
      >
        <ConceptHalf concept={conceptOf(placed.left)} />
        <div className="h-[3px] w-full bg-border" />
        <ConceptHalf concept={conceptOf(placed.right)} />
      </div>
    )
  }
  return (
    <div
      className={`flex h-[68px] w-[136px] shrink-0 overflow-hidden rounded-lg border-[3px] border-border bg-surface shadow-[var(--shadow)] ${animation}`}
    >
      <ConceptHalf concept={conceptOf(placed.left)} />
      <div className="h-full w-[3px] bg-border" />
      <ConceptHalf concept={conceptOf(placed.right)} />
    </div>
  )
}

function EndDropZone({ active, onClick, onDrop }: { active: boolean; onClick: () => void; onDrop: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(event) => {
        if (active) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (active) onDrop()
      }}
      aria-label="Colocar ficha en este extremo"
      className={`flex h-[68px] w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed text-[13px] font-semibold transition-all ${
        active
          ? 'animate-[result-glow-pulse_2s_ease-in-out_infinite] border-accent bg-accent/10 text-accent hover:scale-105'
          : 'border-transparent text-transparent'
      }`}
    >
      +
    </button>
  )
}

/** Fichas de mano notablemente más grandes que en el modo un-jugador, y con
 * borde/fondo tintados por concepto para que cada una se distinga a simple
 * vista sin tener que leer la etiqueta. */
function HandTileView({
  tile,
  selected,
  state,
  conceptOf,
  onClick,
  onDragStart,
}: {
  tile: DominoTileView
  selected: boolean
  state: 'waiting' | 'playable' | 'selected' | 'unavailable'
  conceptOf: (id: number) => DominoConcept
  onClick: () => void
  onDragStart: () => void
}) {
  const a = conceptOf(tile.a)
  const b = conceptOf(tile.b)
  const stateStyles = {
    waiting: 'border-border opacity-75',
    playable: 'border-accent/60 shadow-[0_8px_24px_-14px_var(--accent)]',
    selected: 'z-10 -translate-y-2 border-accent ring-2 ring-accent/35 shadow-[0_18px_30px_-12px_var(--accent)]',
    unavailable: 'border-border opacity-35 grayscale-[0.35]',
  }[state]

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={state !== 'waiting' && state !== 'unavailable'}
      onDragStart={(event) => {
        onDragStart()
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', tile.id)
      }}
      onDragEnd={() => {
        // The board keeps the click selection when a drag is cancelled.
      }}
      aria-pressed={selected}
      className={`flex h-[104px] w-[196px] shrink-0 overflow-hidden rounded-xl border-[3px] bg-surface shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-1.5 ${stateStyles}`}
    >
      <ConceptHalf concept={a} size="lg" />
      <div className="h-full w-[3px]" style={{ background: `linear-gradient(${a.color}, ${b.color})` }} />
      <ConceptHalf concept={b} size="lg" />
    </button>
  )
}

function DominoInstructionsModal({ onContinue }: { onContinue: () => void }) {
  const solar = { conceptId: 'example-solar', label: 'Paneles solares', icon: 'sun', color: '#f59e0b' }
  const green = { conceptId: 'example-green', label: 'Zonas verdes', icon: 'leaf', color: '#22c55e' }

  return (
    <Modal onClose={onContinue} maxWidthClassName="max-w-[520px]">
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent p-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Nexus Play</p>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight text-text-h">Cómo jugar</h2>
        </div>
        <p className="text-[13.5px] leading-relaxed text-text">
          Conecta una ficha con el mismo concepto en uno de los extremos. Si no puedes jugar, roba una ficha. Gana quien se quede sin fichas primero.
        </p>
        <div className="rounded-2xl border border-border bg-code-bg p-4">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-accent">Ejemplo de conexión</p>
          <div className="flex items-center justify-center gap-2 overflow-hidden">
            <div className="flex h-[68px] w-[136px] shrink-0 overflow-hidden rounded-lg border-[3px] border-accent bg-surface shadow-[var(--shadow)]">
              <ConceptHalf concept={solar} size="md" />
              <div className="h-full w-[3px] bg-border" />
              <ConceptHalf concept={green} size="md" />
            </div>
            <span className="text-[18px] font-bold text-accent">+</span>
            <div className="flex h-[68px] w-[136px] shrink-0 overflow-hidden rounded-lg border-[3px] border-accent bg-surface shadow-[var(--shadow)]">
              <ConceptHalf concept={green} size="md" />
              <div className="h-full w-[3px] bg-border" />
              <ConceptHalf concept={solar} size="md" />
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] text-text">El concepto del extremo debe coincidir.</p>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          onClick={onContinue}
        >
          <Check className="h-4 w-4" strokeWidth={2.25} />
          Entendido, continuar
        </button>
      </div>
    </Modal>
  )
}
