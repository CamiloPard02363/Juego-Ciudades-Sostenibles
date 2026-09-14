import type { DualQuestCellPosition, DualQuestGateView, DualQuestGemView, DualQuestPlayerView } from './dualQuestTypes'

type DualQuestBoardProps = {
  gridCols: number
  gridRows: number
  grid: number[][]
  corePosition: DualQuestCellPosition
  gates?: DualQuestGateView[]
  gems?: DualQuestGemView[]
  players?: DualQuestPlayerView[]
  fireStart?: DualQuestCellPosition
  waterStart?: DualQuestCellPosition
  /** Si viene, el tablero es editable: clic en una celda cicla su valor 0→1→2→3→0 (usado por el formulario de creación). */
  onCellClick?: (row: number, col: number) => void
}

const FIRE_COLOR = '#f97316'
const WATER_COLOR = '#3b82f6'

function cellClasses(value: number, isCore: boolean): string {
  if (isCore) return 'bg-accent/20 border-accent'
  if (value === 1) return 'bg-text/20 border-border'
  if (value === 2) return 'bg-orange-400/15 border-orange-400/40'
  if (value === 3) return 'bg-blue-400/15 border-blue-400/40'
  return 'bg-code-bg border-border'
}

/**
 * Tablero de Dúo Lógico: cuadrícula CSS donde cada celda muestra su tipo
 * (muro, solo-FIRE, solo-WATER), con compuertas, gemas y fichas de jugador
 * superpuestas. También sirve como editor (con `onCellClick`) para el
 * formulario de creación — mismo componente, sin duplicar el layout.
 */
export function DualQuestBoard({
  gridCols,
  gridRows,
  grid,
  corePosition,
  gates = [],
  gems = [],
  players = [],
  fireStart,
  waterStart,
  onCellClick,
}: DualQuestBoardProps) {
  const gateAt = (row: number, col: number) => gates.find((g) => g.position.row === row && g.position.col === col)
  const gemAt = (row: number, col: number) => gems.find((g) => g.position.row === row && g.position.col === col)
  const playersAt = (row: number, col: number) => players.filter((p) => p.position.row === row && p.position.col === col)
  const isFireStart = (row: number, col: number) => fireStart?.row === row && fireStart?.col === col
  const isWaterStart = (row: number, col: number) => waterStart?.row === row && waterStart?.col === col

  return (
    <div
      className="grid w-full gap-0.5"
      style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)`, aspectRatio: `${gridCols} / ${gridRows}` }}
    >
      {Array.from({ length: gridRows }, (_, row) =>
        Array.from({ length: gridCols }, (_, col) => {
          const value = grid[row]?.[col] ?? 0
          const isCore = corePosition.row === row && corePosition.col === col
          const gate = gateAt(row, col)
          const gem = gemAt(row, col)
          const cellPlayers = playersAt(row, col)

          const content = (
            <>
              {isFireStart(row, col) && <span className="absolute left-0.5 top-0.5 text-[7px] text-orange-500">F</span>}
              {isWaterStart(row, col) && <span className="absolute left-0.5 top-0.5 text-[7px] text-blue-500">A</span>}
              {isCore && <span className="text-[9px] font-bold text-accent">◆</span>}
              {gate && (
                <span
                  className="h-2 w-2 rounded-sm border"
                  style={{
                    background: gate.open ? 'transparent' : '#78716c',
                    borderColor: gate.open ? '#22c55e' : '#57534e',
                  }}
                  title={gate.open ? 'Compuerta abierta' : 'Compuerta cerrada'}
                />
              )}
              {gem && !gem.collected && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: gem.role === 'FIRE' ? FIRE_COLOR : WATER_COLOR }}
                  title={gem.label}
                />
              )}
              {cellPlayers.map((player) => (
                <span
                  key={player.userId}
                  className="absolute inset-0.5 flex items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-white shadow-sm"
                  style={{ background: player.role === 'FIRE' ? FIRE_COLOR : WATER_COLOR }}
                  title={player.displayName}
                >
                  {player.role === 'FIRE' ? '🔥' : '💧'}
                </span>
              ))}
            </>
          )

          const className = `relative flex items-center justify-center rounded-[3px] border text-[9px] ${cellClasses(value, isCore)}`

          if (onCellClick) {
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={`${className} cursor-pointer`}
                onClick={() => onCellClick(row, col)}
              >
                {content}
              </button>
            )
          }

          return (
            <div key={`${row}-${col}`} className={className}>
              {content}
            </div>
          )
        }),
      )}
    </div>
  )
}
