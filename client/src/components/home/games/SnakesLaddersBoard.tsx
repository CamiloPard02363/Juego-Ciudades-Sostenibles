import { BOARD_COLUMNS, boardRowCount, buildCellPositions } from './snakesLaddersTypes'
import type { SnakesLaddersLink, SnakesLaddersRoomPlayerView } from './snakesLaddersTypes'

type SnakesLaddersBoardProps = {
  boardSize: number
  ladders: SnakesLaddersLink[]
  snakes: SnakesLaddersLink[]
  players: SnakesLaddersRoomPlayerView[]
  activePlayerUserId: string | null
}

/** Un color estable por jugador según su posición en la sala (hasta 4). */
const PLAYER_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7']

/**
 * Tablero dinámico: numera las casillas en serpentina según `boardSize`,
 * dibuja escaleras (verde) y serpientes (rojo) como líneas entre `from`/`to`
 * sobre un `<svg>` con `viewBox` en unidades de grilla (así escala solo, sin
 * cálculos de píxeles), y coloca una ficha por jugador en su casilla actual.
 */
export function SnakesLaddersBoard({ boardSize, ladders, snakes, players, activePlayerUserId }: SnakesLaddersBoardProps) {
  const positions = buildCellPositions(boardSize)
  const rows = boardRowCount(boardSize)
  const columns = BOARD_COLUMNS

  function centerOf(cellNumber: number): { x: number; y: number } {
    const pos = positions.get(cellNumber)
    if (!pos) return { x: 0, y: 0 }
    return { x: pos.col + 0.5, y: pos.row + 0.5 }
  }

  const cells = Array.from({ length: boardSize }, (_, i) => i + 1)

  return (
    <div className="relative w-full" style={{ aspectRatio: `${columns} / ${rows}` }}>
      <div
        className="absolute inset-0 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {cells.map((cellNumber) => {
          const pos = positions.get(cellNumber)!
          const isLadderBase = ladders.some((l) => l.from === cellNumber)
          const isSnakeHead = snakes.some((s) => s.from === cellNumber)
          const isFinal = cellNumber === boardSize
          return (
            <div
              key={cellNumber}
              className={`flex items-center justify-center rounded-md border text-[11px] font-semibold sm:text-[13px] ${
                isFinal
                  ? 'border-accent bg-accent/15 text-accent'
                  : isLadderBase
                    ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-600'
                    : isSnakeHead
                      ? 'border-rose-400/50 bg-rose-400/10 text-rose-600'
                      : 'border-border bg-code-bg text-text'
              }`}
              style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
            >
              {cellNumber}
            </div>
          )
        })}
      </div>

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${columns} ${rows}`}
        preserveAspectRatio="none"
      >
        {ladders.map((ladder, index) => {
          const from = centerOf(ladder.from)
          const to = centerOf(ladder.to)
          return (
            <line
              key={`ladder-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#22c55e"
              strokeWidth={0.08}
              strokeLinecap="round"
              opacity={0.65}
            />
          )
        })}
        {snakes.map((snake, index) => {
          const from = centerOf(snake.from)
          const to = centerOf(snake.to)
          return (
            <line
              key={`snake-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#ef4444"
              strokeWidth={0.08}
              strokeLinecap="round"
              strokeDasharray="0.15 0.1"
              opacity={0.65}
            />
          )
        })}
      </svg>

      <div
        className="pointer-events-none absolute inset-0 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {players.map((player, index) => {
          const pos = positions.get(Math.min(player.position, boardSize))
          if (!pos) return null
          const color = PLAYER_COLORS[index % PLAYER_COLORS.length]
          const isActive = player.userId === activePlayerUserId
          // Cuando 2+ fichas comparten casilla, se desplazan un poco entre sí para que no queden exactamente encimadas.
          const offset = index * 4
          return (
            <div
              key={player.userId}
              className="flex items-end justify-end p-0.5"
              style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
            >
              <span
                title={player.displayName}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-white shadow-sm sm:h-5 sm:w-5 ${
                  isActive ? 'ring-2 ring-offset-1 ring-accent' : ''
                }`}
                style={{ background: color, transform: `translate(-${offset}%, -${offset}%)` }}
              >
                {player.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { PLAYER_COLORS }
