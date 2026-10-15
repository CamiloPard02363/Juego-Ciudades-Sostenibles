import { GameInstructionsGate } from './GameInstructionsGate'
import { MultiplayerLobby } from './MultiplayerLobby'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Crosshair, Hand, LogOut, PackageOpen, RotateCcw, SkipForward, Trophy } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useDominoRoom } from './useDominoRoom'
import { iconForConcept, type DominoConcept } from './dominoTypes'
import type { DominoPlacedTileView, DominoTileView } from './dominoRoomTypes'
import type { DominoVisualOrientation, Point } from './dominoChainLayout'
import { DEFAULT_DOMINO_BOARD_RENDER_MODE, resolveDominoBoardPresentation } from './dominoBoardRenderMode'
import {
  dominoEndDropZoneFocus,
  dominoBoardCameraTransform,
  focusDominoBoardCamera,
  resolveDominoLogicalViewport,
  type DominoCameraDestination,
} from './dominoBoardCamera'
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
  return <GameInstructionsGate kind="DOMINO"><DominoRoomPageSession /></GameInstructionsGate>
}

function DominoRoomPageSession() {
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
    messages,
    sendChatMessage,
    updateTurnDuration,
    playTile,
    drawTile,
    passTurn,
    voteRematch,
    leaveRoom,
  } = useDominoRoom(token)

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [boardScale, setBoardScale] = useState(1)
  const [boardNeedsScroll, setBoardNeedsScroll] = useState(false)
  const [boardViewport, setBoardViewport] = useState({ width: 0, height: 0 })
  const [cameraDestination, setCameraDestination] = useState<DominoCameraDestination>('opening')
  const [draggedTileId, setDraggedTileId] = useState<string | null>(null)
  const boardViewportRef = useRef<HTMLDivElement>(null)
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

  function handleJoinSubmit() {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    startedRef.current = true
    joinRoom(code)
  }

  const self = room?.players.find((p) => p.isSelf)
  const opponent = room?.players.find((p) => !p.isSelf)
  const isMyTurn = room?.phase === 'PLAYING' && room.activePlayerUserId === user?.id
  const conceptOf = (id: number): DominoConcept => room!.concepts[id]

  const board = room?.board ?? []
  const leftEnd = board[0]?.left
  const rightEnd = board[board.length - 1]?.right
  const hand: DominoTileView[] = self?.hand ?? []
  const logicalBoardViewport = useMemo(() => resolveDominoLogicalViewport(boardViewport), [boardViewport])
  const boardPresentation = useMemo(
    () => resolveDominoBoardPresentation(DEFAULT_DOMINO_BOARD_RENDER_MODE, board, logicalBoardViewport, room?.openingTileId),
    [board, logicalBoardViewport, room?.openingTileId],
  )
  const boardCamera = useMemo(() => {
    if (boardPresentation.kind !== 'bidirectional') return null
    const opening = boardPresentation.layout.tiles.find((tile) => tile.id === room?.openingTileId)
    if (!opening) return null
    const focus = cameraDestination === 'left'
      ? dominoEndDropZoneFocus(boardPresentation.layout.leftEnd)
      : cameraDestination === 'right'
        ? dominoEndDropZoneFocus(boardPresentation.layout.rightEnd)
        : { x: opening.x + opening.width / 2, y: opening.y + opening.height / 2 }
    return focusDominoBoardCamera(boardViewport, logicalBoardViewport, focus)
  }, [boardPresentation, boardViewport, cameraDestination, logicalBoardViewport, room?.openingTileId])

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
      setBoardViewport({ width: viewport.clientWidth, height: viewport.clientHeight })
      if (!board.length) {
        setBoardScale(1)
        setBoardNeedsScroll(false)
        return
      }
      const availableWidth = Math.max(1, viewport.clientWidth - 48)
      const tileWidth = board.reduce((total, tile) => total + (tile.isDouble ? 68 : 136), 0)
      const chainWidth = tileWidth + Math.max(0, board.length - 1) * 2 + 80
      const preferredScale = board.length === 1 ? 1.26 : board.length <= 3 ? 1.16 : board.length <= 5 ? 1.08 : 1
      const fitScale = availableWidth / chainWidth
      const nextScale = Math.min(preferredScale, Math.max(0.62, fitScale))

      setBoardScale((current) => Math.abs(current - nextScale) < 0.015 ? current : nextScale)
      setBoardNeedsScroll(fitScale < 0.62)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [board])

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

  if (room?.phase === 'WAITING') return <MultiplayerLobby
    room={room} roomPath={`/domino/sala/${encodeURIComponent(room.code)}`} maxPlayers={2}
    isHost={Boolean(self?.isHost)} connecting={connecting} error={error}
    turnDurationSeconds={room.turnDurationSeconds} onUpdateTurnDuration={updateTurnDuration}

    onReady={setReady} onExit={handleExit} messages={messages} onSend={sendChatMessage}
  >{dealCountdownMs !== null && <DealCountdownOverlay remainingMs={dealCountdownMs} />}</MultiplayerLobby>

  return (
    <div className="domino-premium-room fixed inset-0 z-50 overflow-y-auto bg-[#080F24]">
      {dealCountdownMs !== null && <DealCountdownOverlay remainingMs={dealCountdownMs} />}

      <div className="domino-premium-shell mx-auto flex min-h-full w-full max-w-[1600px] flex-col p-3 sm:p-5">
        <header className="domino-premium-header mb-1.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 sm:flex-nowrap">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              {room?.gameTitle ?? 'Dominó'}
            </p>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[15px] font-bold tracking-tight text-text-h">Sala en vivo</h1>
              {room && <span className="domino-premium-status rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{room.phase === 'PLAYING' ? 'En partida' : room.phase === 'FINISHED' ? 'Finalizada' : 'Esperando'}</span>}
            </div>
          </div>
          {room && room.phase === 'PLAYING' && opponent && (
            <div className="domino-premium-match-facts" aria-label={`Rival: ${opponent.displayName}, ${opponent.handCount} fichas. Pozo: ${room.boneyardCount} fichas`}>
              <span className="domino-premium-match-fact">
                <small>Rival</small>
                <strong title={opponent.displayName}>{opponent.displayName}</strong>
                <b>{opponent.handCount}</b>
              </span>
              <span className="domino-premium-match-fact domino-premium-match-fact--boneyard">
                <small>Pozo</small>
                <b>{room.boneyardCount}</b>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
          {room?.phase === 'PLAYING' && (
            <div className={`domino-premium-turn ${isMyTurn ? 'domino-premium-turn--self' : 'domino-premium-turn--rival'}`}>
              <span className="domino-premium-turn-dot" aria-hidden="true" />
              <TurnBanner isMyTurn={isMyTurn} remainingMs={remainingMs} turnDurationSeconds={room.turnDurationSeconds} variant="inline" />
            </div>
          )}
          <button
            type="button"
            className="domino-premium-exit flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold"
            onClick={handleExit}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Salir
          </button>
          </div>
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


        {room && room.phase === 'PLAYING' && opponent && (
          <div className="domino-premium-game flex min-h-0 flex-1 flex-col gap-2">
            <TurnPopBanner isMyTurn={isMyTurn} opponentName={opponent.displayName} />

            <section className="domino-premium-stage flex min-h-0 flex-1 flex-col">
            {/* Tablero */}
            <div ref={boardViewportRef} className="domino-premium-board flex min-h-[260px] flex-1 overflow-hidden rounded-2xl border p-3 sm:min-h-[340px] sm:p-5">
              <span className="domino-premium-board-mark" aria-hidden="true" />
              {board.length === 0 ? (
                <p className="m-auto text-center text-[13px] text-text">
                  {isMyTurn ? 'Toca una ficha de tu mano para abrir la partida.' : 'Esperando la primera jugada…'}
                </p>
              ) : boardPresentation.kind !== 'linear' ? (
                <div className="domino-serpentine-stage">
                  {boardPresentation.kind === 'bidirectional' && (
                    <div className="domino-board-camera-controls" role="group" aria-label="Navegación del tablero virtual">
                      <div className="domino-board-camera-controls__header">
                        <span>Explorar tablero</span>
                        <details className="domino-board-camera-help">
                          <summary aria-label="Cómo explorar el tablero">Ayuda</summary>
                          <p>Usa estos botones para recorrer el dominó. La vista seguirá el extremo que elijas.</p>
                        </details>
                      </div>
                      <div className="domino-board-camera-controls__actions">
                        <button
                          type="button"
                          className="domino-board-camera-control"
                          aria-label="Ir al extremo A de la cadena"
                          aria-pressed={cameraDestination === 'left'}
                          onClick={() => setCameraDestination('left')}
                        >
                          <ChevronLeft aria-hidden="true" size={17} />
                          <span>Extremo A</span>
                        </button>
                        <button
                          type="button"
                          className="domino-board-camera-control"
                          aria-label="Centrar en la ficha inicial"
                          aria-pressed={cameraDestination === 'opening'}
                          onClick={() => setCameraDestination('opening')}
                        >
                          <Crosshair aria-hidden="true" size={15} />
                          <span>Inicio</span>
                        </button>
                        <button
                          type="button"
                          className="domino-board-camera-control"
                          aria-label="Ir al extremo B de la cadena"
                          aria-pressed={cameraDestination === 'right'}
                          onClick={() => setCameraDestination('right')}
                        >
                          <ChevronRight aria-hidden="true" size={17} />
                          <span>Extremo B</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    className="domino-virtual-board-world"
                    style={boardPresentation.kind === 'bidirectional' && boardCamera
                      ? {
                          width: logicalBoardViewport.width,
                          height: logicalBoardViewport.height,
                          transform: dominoBoardCameraTransform(boardCamera),
                        }
                      : undefined}
                  >
                  {boardPresentation.layout.tiles.map((placement) => {
                    const placed = board[placement.index]
                    const visualOrientation = 'visualOrientation' in placement
                      ? placement.visualOrientation
                      : placement.orientation
                    return (
                      <div
                        key={placement.id}
                        className="domino-serpentine-tile"
                        style={{ left: placement.x, top: placement.y }}
                      >
                        <BoardTileView
                          placed={placed}
                          conceptOf={conceptOf}
                          justPlaced={placed.id === lastPlacedTileId}
                          orientation={visualOrientation}
                          articulation={placed.isDouble && visualOrientation === 'double-vertical'}
                        />
                      </div>
                    )
                  })}
                  <EndDropZone
                    active={isMyTurn && Boolean(selectedTile) && canPlaceLeft}
                    onClick={() => handleEndClick('left')}
                    onDrop={() => handleEndClick('left')}
                    visualPosition={{ x: boardPresentation.layout.leftEnd.x - 20, y: boardPresentation.layout.leftEnd.y - 34 }}
                    className="domino-serpentine-end"
                  />
                  <EndDropZone
                    active={isMyTurn && Boolean(selectedTile) && canPlaceRight}
                    onClick={() => handleEndClick('right')}
                    onDrop={() => handleEndClick('right')}
                    visualPosition={{ x: boardPresentation.layout.rightEnd.x - 20, y: boardPresentation.layout.rightEnd.y - 34 }}
                    className="domino-serpentine-end"
                  />
                  </div>
                </div>
              ) : (
                <div className={`domino-premium-chain-viewport flex min-h-[82px] w-full items-center ${boardNeedsScroll ? 'justify-start overflow-x-auto' : 'justify-center overflow-hidden'}`}>
                  <div
                    className={`domino-premium-chain flex w-max items-center gap-[2px] ${boardNeedsScroll ? 'domino-premium-chain--scroll mx-5' : ''}`}
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
            </section>

            {/* Acciones: robar / pasar, solo tienen efecto en tu turno */}
            <section className="domino-premium-hand-dock rounded-2xl border p-2.5 sm:p-2.5">
            <div className="domino-premium-hand-layout">
            <div className={`domino-premium-local-player ${isMyTurn ? 'domino-premium-local-player--active' : ''}`}>
              <span className="domino-premium-local-avatar" aria-hidden="true"><Hand className="h-3.5 w-3.5" strokeWidth={2} /></span>
              <span>
                <strong>Tú</strong>
                <small>{hand.length} fichas</small>
              </span>
            </div>
            <div className="domino-premium-actions flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isMyTurn || room.boneyardCount === 0 || hasValidMove}
                onClick={drawTile}
              >
                <PackageOpen className="h-4 w-4" strokeWidth={1.8} />
                Robar del pozo
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isMyTurn || room.boneyardCount > 0 || hasValidMove}
                onClick={passTurn}
              >
                <SkipForward className="h-4 w-4" strokeWidth={1.8} />
                Pasar turno
              </button>
            </div>

            {/* Mano propia — fichas grandes y visualmente diferenciadas por
                concepto (ícono + color propios), animadas al entrar/jugar. */}
            <div className="domino-premium-hand-area">
              <div className="domino-premium-hand-scroll">
              <div className="domino-premium-hand-tiles flex gap-3">
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
            </div>
            </section>
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

function ConceptHalf({ concept, size = 'md' }: { concept: DominoConcept; size?: 'board' | 'sm' | 'md' | 'lg' }) {
  const Icon = iconForConcept(concept.icon)
  const sizing =
    size === 'lg' ? 'px-2 py-3.5 gap-1.5' : size === 'board' ? 'domino-tile-half--board px-1 py-1 gap-0.5' : size === 'sm' ? 'px-1.5 py-2 gap-1' : 'px-1.5 py-2.5 gap-1'
  const iconSize = size === 'lg' ? 'h-8 w-8' : size === 'board' ? 'h-4 w-4 shrink-0' : size === 'sm' ? 'h-4.5 w-4.5' : 'h-6 w-6'
  const textSize = size === 'lg' ? 'text-[11px]' : size === 'board' ? 'text-[8px] leading-[0.58rem]' : size === 'sm' ? 'text-[8.5px]' : 'text-[9.5px]'

  return (
    <div
      className={`domino-tile-half flex flex-1 flex-col items-center justify-center ${sizing}`}
      style={{ background: `color-mix(in srgb, ${concept.color} 10%, transparent)` }}
    >
      <Icon className={iconSize} style={{ color: concept.color }} strokeWidth={2} />
      <span className={`domino-tile-label w-full text-center font-semibold text-text-h ${size === 'board' ? '' : 'leading-tight'} ${textSize}`}>{concept.label}</span>
    </div>
  )
}

export type BoardTilePresentation = {
  orientation: DominoVisualOrientation
  width: number
  height: number
  axis: 'row' | 'column'
}

export const BOARD_TILE_CONTENT = {
  padding: 4,
  icon: 16,
  gap: 2,
  textFont: 8,
  textLineHeight: 9.28,
} as const

/** Espacio interno útil por mitad; permite validar etiquetas sin tocar la geometría. */
export function boardTileContentPresentation(orientation: DominoVisualOrientation) {
  const tile = boardTilePresentation(orientation.startsWith('double'), orientation)
  const vertical = orientation === 'vertical' || orientation === 'double-vertical'
  const contentHeight = vertical
    ? (tile.height - 6 - 3) / 2 - BOARD_TILE_CONTENT.padding * 2
    : tile.height - 6 - BOARD_TILE_CONTENT.padding * 2
  const contentWidth = vertical
    ? tile.width - 6 - BOARD_TILE_CONTENT.padding * 2
    : (tile.width - 6 - 3) / 2 - BOARD_TILE_CONTENT.padding * 2
  return {
    contentWidth,
    contentHeight,
    maxLines: Math.floor((contentHeight - BOARD_TILE_CONTENT.icon - BOARD_TILE_CONTENT.gap) / BOARD_TILE_CONTENT.textLineHeight),
  }
}

/** Datos de presentación independientes del DOM; el valor predeterminado conserva la sala lineal. */
export function boardTilePresentation(
  isDouble: boolean,
  requested?: DominoVisualOrientation,
): BoardTilePresentation {
  const orientation = requested ?? (isDouble ? 'double-vertical' : 'horizontal')
  switch (orientation) {
    case 'vertical': return { orientation, width: 68, height: 136, axis: 'column' }
    case 'double-horizontal': return { orientation, width: 124, height: 68, axis: 'row' }
    case 'double-vertical': return { orientation, width: 68, height: 124, axis: 'column' }
    default: return { orientation: 'horizontal', width: 136, height: 68, axis: 'row' }
  }
}

/** Fichas de tablero orientables. No rota el contenido: reordena mitades y divisor. */
export function BoardTileView({
  placed,
  conceptOf,
  justPlaced,
  orientation,
  articulation = false,
}: {
  placed: DominoPlacedTileView
  conceptOf: (id: number) => DominoConcept
  justPlaced: boolean
  orientation?: DominoVisualOrientation
  articulation?: boolean
}) {
  const animation = justPlaced ? 'animate-[domino-tile-play-in_0.22s_cubic-bezier(0.16,1,0.3,1)_backwards]' : ''
  const presentation = boardTilePresentation(placed.isDouble, orientation)
  const vertical = presentation.axis === 'column'
  return (
    <div
      className={`domino-premium-tile domino-board-tile ${placed.isDouble ? 'domino-board-tile--double' : ''} ${articulation ? 'domino-board-tile--articulation' : ''} flex shrink-0 overflow-hidden rounded-lg border-[3px] ${vertical ? 'flex-col' : ''} ${animation}`}
      style={{ width: presentation.width, height: presentation.height }}
    >
      <ConceptHalf concept={conceptOf(placed.left)} size="board" />
      <div className={`domino-tile-divider ${vertical ? 'h-[3px] w-full' : 'h-full w-[3px]'}`} />
      <ConceptHalf concept={conceptOf(placed.right)} size="board" />
    </div>
  )
}

export function EndDropZone({
  active,
  onClick,
  onDrop,
  visualPosition,
  className = '',
}: {
  active: boolean
  onClick: () => void
  onDrop: () => void
  visualPosition?: Point
  className?: string
}) {
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
      className={`flex h-[68px] w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed text-[13px] font-semibold transition-all ${className} ${
        active
          ? 'animate-[result-glow-pulse_2s_ease-in-out_infinite] border-accent bg-accent/10 text-accent hover:scale-105'
          : 'border-transparent text-transparent'
      }`}
      style={visualPosition ? { position: 'absolute', left: visualPosition.x, top: visualPosition.y } : undefined}
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
    waiting: 'domino-tile--waiting',
    playable: 'domino-tile--playable',
    selected: 'domino-tile--selected',
    unavailable: 'domino-tile--unavailable',
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
      className={`domino-premium-tile domino-hand-tile flex h-[104px] w-[196px] shrink-0 overflow-hidden rounded-xl border-[3px] transition-all duration-200 ${stateStyles}`}
    >
      <ConceptHalf concept={a} size="lg" />
      <div className="domino-tile-divider h-full w-[3px]" style={{ background: `linear-gradient(${a.color}, ${b.color})` }} />
      <ConceptHalf concept={b} size="lg" />
    </button>
  )
}
