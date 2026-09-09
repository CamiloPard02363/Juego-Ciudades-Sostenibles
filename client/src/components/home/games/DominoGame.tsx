import { useCallback, useEffect, useState } from 'react'
import { Frown, LogOut, RotateCcw, Trophy } from 'lucide-react'
import { Modal } from './Modal'
import {
  DEFAULT_DOMINO_CONFIG,
  iconForConcept,
  type DominoConcept,
} from './dominoTypes'

/**
 * Reproductor genérico de dominó temático: en vez de números, cada mitad de
 * una ficha es un concepto que llega por props (`concepts`), así que el mismo
 * componente sirve para cualquier dominó publicado por la comunidad — el
 * primero fue "Nexus Play: Ecosistemas Sostenibles". Juego de un solo jugador
 * contra el tablero (sin backend, sin rival): la mecánica de dominó (empatar
 * extremos abiertos) es el reto en sí mismo.
 */

/** Índice dentro del arreglo `concepts` recibido por props. */
type ConceptId = number

/** Una ficha "en mano": sus dos mitades, sin orientar todavía. */
type Tile = {
  id: string
  a: ConceptId
  b: ConceptId
}

/** Una ficha ya colocada en el tablero: `left`/`right` son sus mitades YA orientadas
 * (después de decidir cuál lado conecta con el extremo abierto correspondiente). */
type PlacedTile = {
  id: string
  left: ConceptId
  right: ConceptId
  isDouble: boolean
}

type GameStatus = 'playing' | 'won' | 'blocked'

/** Set completo temático: para N conceptos, todas las combinaciones a<=b dan
 * N*(N+1)/2 fichas únicas (con los 6 conceptos mínimos, 21 fichas — el tamaño
 * del "double-six" tradicional). */
function generateTiles(conceptCount: number): Tile[] {
  const tiles: Tile[] = []
  for (let a = 0; a < conceptCount; a++) {
    for (let b = a; b < conceptCount; b++) {
      tiles.push({ id: `${a}-${b}`, a, b })
    }
  }
  return tiles
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

type DominoGameProps = {
  /** Título del juego publicado; encabeza el modal. */
  title: string
  /** Conceptos que reemplazan a los números de las fichas (mínimo 6). */
  concepts: DominoConcept[]
  /** Fichas que recibe el jugador al repartir; el resto va al pozo. */
  handSize?: number
  onExit: () => void
}

export function DominoGame({ title, concepts, handSize, onExit }: DominoGameProps) {
  const conceptCount = concepts.length
  const effectiveHandSize = handSize ?? DEFAULT_DOMINO_CONFIG.handSize

  function conceptOf(id: ConceptId): DominoConcept {
    return concepts[id]
  }

  const [hand, setHand] = useState<Tile[]>([])
  const [pozo, setPozo] = useState<Tile[]>([])
  const [board, setBoard] = useState<PlacedTile[]>([])
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [status, setStatus] = useState<GameStatus>('playing')
  const [moves, setMoves] = useState(0)

  const restart = useCallback(() => {
    const shuffled = shuffle(generateTiles(conceptCount))
    setHand(shuffled.slice(0, effectiveHandSize))
    setPozo(shuffled.slice(effectiveHandSize))
    setBoard([])
    setSelectedTileId(null)
    setStatus('playing')
    setMoves(0)
  }, [conceptCount, effectiveHandSize])

  // Reparto inicial al montar, y re-reparto si cambia el contenido del juego
  // (otro dominó publicado con distinta cantidad de conceptos o de fichas en mano).
  useEffect(() => {
    restart()
  }, [restart])

  const leftEnd = board[0]?.left
  const rightEnd = board[board.length - 1]?.right

  function tileMatchesEnd(tile: Tile, end: ConceptId | undefined): boolean {
    if (end === undefined) return true // tablero vacío: cualquier ficha abre la partida
    return tile.a === end || tile.b === end
  }

  const hasValidMove =
    board.length === 0
      ? hand.length > 0
      : hand.some((tile) => tileMatchesEnd(tile, leftEnd) || tileMatchesEnd(tile, rightEnd))

  // Detecta victoria/bloqueo apenas cambia la mano, el tablero o el pozo.
  useEffect(() => {
    if (status !== 'playing') return
    if (hand.length === 0) {
      setStatus('won')
      return
    }
    if (!hasValidMove && pozo.length === 0) {
      setStatus('blocked')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand, board, pozo, status])

  function placeTile(tile: Tile, side: 'left' | 'right') {
    if (status !== 'playing') return

    if (board.length === 0) {
      const placed: PlacedTile = { id: tile.id, left: tile.a, right: tile.b, isDouble: tile.a === tile.b }
      setBoard([placed])
    } else if (side === 'right') {
      if (tile.a !== rightEnd && tile.b !== rightEnd) return
      const placed: PlacedTile =
        tile.a === rightEnd
          ? { id: tile.id, left: tile.a, right: tile.b, isDouble: tile.a === tile.b }
          : { id: tile.id, left: tile.b, right: tile.a, isDouble: tile.a === tile.b }
      setBoard((current) => [...current, placed])
    } else {
      if (tile.a !== leftEnd && tile.b !== leftEnd) return
      // La mitad que conecta con el extremo izquierdo queda a la derecha de la
      // ficha nueva (tocando); la otra mitad se vuelve el nuevo extremo abierto.
      const placed: PlacedTile =
        tile.a === leftEnd
          ? { id: tile.id, left: tile.b, right: tile.a, isDouble: tile.a === tile.b }
          : { id: tile.id, left: tile.a, right: tile.b, isDouble: tile.a === tile.b }
      setBoard((current) => [placed, ...current])
    }

    setHand((current) => current.filter((t) => t.id !== tile.id))
    setSelectedTileId(null)
    setMoves((current) => current + 1)
  }

  function handleHandTileClick(tile: Tile) {
    if (status !== 'playing') return
    if (selectedTileId === tile.id) {
      setSelectedTileId(null)
      return
    }
    // Con el tablero vacío no hay extremos que elegir: se coloca directo.
    if (board.length === 0) {
      placeTile(tile, 'right')
      return
    }
    setSelectedTileId(tile.id)
  }

  function handleEndClick(side: 'left' | 'right') {
    if (!selectedTileId) return
    const tile = hand.find((t) => t.id === selectedTileId)
    if (!tile) return
    const end = side === 'left' ? leftEnd : rightEnd
    if (!tileMatchesEnd(tile, end)) return
    placeTile(tile, side)
  }

  function drawFromPozo() {
    if (pozo.length === 0 || status !== 'playing') return
    const [next, ...rest] = pozo
    setHand((current) => [...current, next])
    setPozo(rest)
  }

  const selectedTile = hand.find((t) => t.id === selectedTileId) ?? null
  const canPlaceLeft = selectedTile ? tileMatchesEnd(selectedTile, leftEnd) : false
  const canPlaceRight = selectedTile ? tileMatchesEnd(selectedTile, rightEnd) : false

  return (
    <Modal onClose={onExit} maxWidthClassName="max-w-[980px]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] tracking-tight text-text-h">{title}</h2>
          <p className="text-[12.5px] text-text">
            Conecta los conceptos como en el dominó tradicional.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
            onClick={restart}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            Reiniciar
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
            onClick={onExit}
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Salir
          </button>
        </div>
      </div>

      {status === 'won' && (
        <div className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 p-6 text-center animate-[fade-in-up_0.3s_ease-out]">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          >
            <Trophy className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-[16px] font-semibold text-text-h">¡Victoria! Te quedaste sin fichas.</p>
          <p className="text-[13px] text-text">Lo lograste en {moves} jugadas.</p>
          <button
            type="button"
            className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={restart}
          >
            Jugar de nuevo
          </button>
        </div>
      )}

      {status === 'blocked' && (
        <div className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-danger/35 bg-danger/10 p-6 text-center animate-[fade-in-up_0.3s_ease-out]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
            <Frown className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-[16px] font-semibold text-text-h">Bloqueo — no quedan movimientos posibles.</p>
          <p className="text-[13px] text-text">
            Ninguna ficha en tu mano encaja en los extremos abiertos y el pozo está vacío.
          </p>
          <button
            type="button"
            className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={restart}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tablero */}
      <div className="mb-5 rounded-xl border border-border bg-code-bg p-4">
        <p className="mb-3 text-[11.5px] font-semibold tracking-wide text-text/70 uppercase">Mesa</p>
        {board.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-text">
            Toca una ficha de tu mano para abrir la partida.
          </p>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            <EndDropZone
              active={status === 'playing' && Boolean(selectedTile) && canPlaceLeft}
              onClick={() => handleEndClick('left')}
            />
            {board.map((placed) => (
              <BoardTileView key={placed.id} placed={placed} conceptOf={conceptOf} />
            ))}
            <EndDropZone
              active={status === 'playing' && Boolean(selectedTile) && canPlaceRight}
              onClick={() => handleEndClick('right')}
            />
          </div>
        )}
      </div>

      {/* Pozo */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <p className="text-[12.5px] text-text">
          Pozo: <strong className="text-text-h">{pozo.length}</strong> ficha
          {pozo.length === 1 ? '' : 's'} restante{pozo.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          className="rounded-lg border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pozo.length === 0 || status !== 'playing'}
          onClick={drawFromPozo}
        >
          Robar del pozo
        </button>
      </div>

      {/* Mano del jugador */}
      <div>
        <p className="mb-3 text-[11.5px] font-semibold tracking-wide text-text/70 uppercase">
          Tu mano ({hand.length})
        </p>
        <div className="flex flex-wrap gap-2.5">
          {hand.map((tile) => {
            const playable =
              status === 'playing' && (board.length === 0 || tileMatchesEnd(tile, leftEnd) || tileMatchesEnd(tile, rightEnd))
            return (
              <HandTileView
                key={tile.id}
                tile={tile}
                selected={selectedTileId === tile.id}
                dimmed={!playable}
                conceptOf={conceptOf}
                onClick={() => handleHandTileClick(tile)}
              />
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

function ConceptHalf({ concept, size = 'md' }: { concept: DominoConcept; size?: 'sm' | 'md' }) {
  const Icon = iconForConcept(concept.icon)
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-1 ${size === 'sm' ? 'px-1 py-1.5' : 'px-1.5 py-2.5'}`}
    >
      <Icon
        className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'}
        style={{ color: concept.color }}
        strokeWidth={2}
      />
      <span
        className={`text-center leading-tight font-medium text-text-h ${size === 'sm' ? 'text-[8px]' : 'text-[9.5px]'}`}
      >
        {concept.label}
      </span>
    </div>
  )
}

function BoardTileView({ placed, conceptOf }: { placed: PlacedTile; conceptOf: (id: ConceptId) => DominoConcept }) {
  // Las fichas dobles se rotan 90° para distinguirse, como en el dominó tradicional.
  if (placed.isDouble) {
    return (
      <div className="flex h-[76px] w-[46px] shrink-0 flex-col overflow-hidden rounded-md border-2 border-border bg-surface shadow-[var(--shadow)] animate-[fade-in-up_0.25s_ease-out]">
        <ConceptHalf concept={conceptOf(placed.left)} size="sm" />
        <div className="h-px w-full bg-border" />
        <ConceptHalf concept={conceptOf(placed.right)} size="sm" />
      </div>
    )
  }
  return (
    <div className="flex h-[46px] w-[92px] shrink-0 overflow-hidden rounded-md border-2 border-border bg-surface shadow-[var(--shadow)] animate-[fade-in-up_0.25s_ease-out]">
      <ConceptHalf concept={conceptOf(placed.left)} size="sm" />
      <div className="h-full w-px bg-border" />
      <ConceptHalf concept={conceptOf(placed.right)} size="sm" />
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
      className={`flex h-[46px] w-8 shrink-0 items-center justify-center rounded-md border-2 border-dashed text-[11px] font-semibold transition-colors ${
        active
          ? 'animate-[result-glow-pulse_2s_ease-in-out_infinite] border-accent bg-accent/10 text-accent'
          : 'border-transparent text-transparent'
      }`}
    >
      +
    </button>
  )
}

function HandTileView({
  tile,
  selected,
  dimmed,
  conceptOf,
  onClick,
}: {
  tile: Tile
  selected: boolean
  dimmed: boolean
  conceptOf: (id: ConceptId) => DominoConcept
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[64px] w-[124px] shrink-0 overflow-hidden rounded-lg border-2 bg-surface shadow-[var(--shadow)] transition-transform hover:-translate-y-1 ${
        selected ? 'border-accent' : 'border-border'
      } ${dimmed ? 'opacity-45' : ''}`}
    >
      <ConceptHalf concept={conceptOf(tile.a)} />
      <div className="h-full w-px bg-border" />
      <ConceptHalf concept={conceptOf(tile.b)} />
    </button>
  )
}
