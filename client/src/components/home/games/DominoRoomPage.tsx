import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Copy, LogOut, RotateCcw, Trophy, Users } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useDominoRoom } from './useDominoRoom'
import { iconForConcept, type DominoConcept } from './dominoTypes'
import type { DominoPlacedTileView, DominoTileView } from './dominoRoomTypes'
import { DealCountdownOverlay, TurnBanner, TurnPopBanner, useCountdown } from './MatchBoard'

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
    startGame,
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
  const startedRef = useRef(false)

  const remainingMs = useCountdown(room?.turnDeadline ?? null)

  // Arranque de la sala: si la URL trae ?gameId= crea una sala nueva; si trae
  // un código en el path, se une a esa sala. Se hace una sola vez (guard con
  // startedRef) para no reintentar en cada re-render del hook de socket.
  useEffect(() => {
    if (connecting || startedRef.current) return
    if (codeFromUrl) {
      startedRef.current = true
      joinRoom(codeFromUrl.toUpperCase())
    } else if (gameIdToCreate) {
      startedRef.current = true
      createRoom(gameIdToCreate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, codeFromUrl, gameIdToCreate])

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
    if (!selectedTileId) return
    playTile(selectedTileId, side)
    setSelectedTileId(null)
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
          <div className="mx-auto flex w-full max-w-[420px] flex-col gap-5 rounded-2xl border border-border bg-surface p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Users className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <p className="text-[15px] font-semibold text-text-h">Esperando al rival…</p>
              <p className="text-[13px] text-text">Comparte este código para que se una:</p>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-2 rounded-lg border border-border bg-code-bg px-4 py-2 text-[18px] font-bold tracking-[0.3em] text-text-h"
              >
                {room.code}
                <Copy className="h-4 w-4 shrink-0" strokeWidth={2} />
              </button>
              {copyFeedback && <p className="text-[12px] text-accent">¡Copiado!</p>}
            </div>

            <ul className="flex flex-col gap-1.5 text-left text-[13px] text-text">
              {room.players.map((player) => (
                <li key={player.userId} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {player.displayName}
                  {player.isHost && <span className="text-[11px] text-text/60">(anfitrión)</span>}
                </li>
              ))}
            </ul>

            {/* Solo quien creó la sala puede fijar los segundos por turno —
                el rival ve el valor pero no puede tocarlo. */}
            <label className="flex flex-col gap-1.5 text-left text-[12.5px] text-text">
              Segundos por turno
              <input
                type="number"
                min={5}
                max={120}
                value={room.turnDurationSeconds}
                disabled={!isHostSelf}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isInteger(value) && value >= 5 && value <= 120) updateTurnDuration(value)
                }}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-text-h disabled:opacity-60"
              />
            </label>

            <button
              type="button"
              disabled={room.players.length !== 2}
              className="rounded-lg px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={() => startGame()}
            >
              {room.players.length === 2 ? 'Iniciar partida' : 'Esperando al segundo jugador…'}
            </button>
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
            <div className="rounded-xl border border-border bg-code-bg p-4">
              {board.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-text">
                  {isMyTurn ? 'Toca una ficha de tu mano para abrir la partida.' : 'Esperando la primera jugada…'}
                </p>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <EndDropZone
                    active={isMyTurn && Boolean(selectedTile) && canPlaceLeft}
                    onClick={() => handleEndClick('left')}
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
                  />
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
                  const playable = isMyTurn && (board.length === 0 || tileMatchesEnd(tile, leftEnd) || tileMatchesEnd(tile, rightEnd))
                  return (
                    <HandTileView
                      key={tile.id}
                      tile={tile}
                      selected={selectedTileId === tile.id}
                      dimmed={!playable && isMyTurn}
                      conceptOf={conceptOf}
                      onClick={() => handleHandTileClick(tile)}
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
                    onClick={() => voteRematch(false)}
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

function EndDropZone({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!active}
      aria-label="Colocar ficha en este extremo"
      className={`flex h-[68px] w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed text-[13px] font-semibold transition-colors ${
        active
          ? 'animate-[result-glow-pulse_2s_ease-in-out_infinite] border-accent bg-accent/10 text-accent'
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
  dimmed,
  conceptOf,
  onClick,
}: {
  tile: DominoTileView
  selected: boolean
  dimmed: boolean
  conceptOf: (id: number) => DominoConcept
  onClick: () => void
}) {
  const a = conceptOf(tile.a)
  const b = conceptOf(tile.b)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[104px] w-[196px] shrink-0 overflow-hidden rounded-xl border-[3px] bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-1.5 ${
        selected ? 'border-accent' : 'border-border'
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <ConceptHalf concept={a} size="lg" />
      <div className="h-full w-[3px]" style={{ background: `linear-gradient(${a.color}, ${b.color})` }} />
      <ConceptHalf concept={b} size="lg" />
    </button>
  )
}
