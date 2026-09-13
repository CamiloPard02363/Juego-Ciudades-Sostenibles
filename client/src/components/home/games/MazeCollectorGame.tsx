import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import type { MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef } from './mazeCollectorTypes'
import { iconForConcept } from './mazeCollectorTypes'
import { useMazeCollectorGame } from './useMazeCollectorGame'
import type { Direction } from './useMazeCollectorGame'
import { ConfettiBurst } from '../../kids/ConfettiBurst'

type MazeCollectorGameProps = {
  title: string
  primaryColor: string
  layout: MazeLayoutDef
  items: MazeCollectorItem[]
  config: MazeCollectorConfig
  onExit: () => void
}

const CELL_SIZE = 32

export function MazeCollectorGame({ title, primaryColor, layout, items, config, onExit }: MazeCollectorGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useMazeCollectorGame({ layout, items, config })

  const width = layout.cols * CELL_SIZE
  const height = layout.rows * CELL_SIZE

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    // Paredes
    ctx.fillStyle = primaryColor
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        if (layout.grid[row][col] === 1) {
          ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    // Objetos restantes
    for (const entry of game.remainingItemPositions) {
      const item = items.find((i) => i.itemId === entry.itemId)
      if (!item) continue
      const cx = entry.position.col * CELL_SIZE + CELL_SIZE / 2
      const cy = entry.position.row * CELL_SIZE + CELL_SIZE / 2
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(cx, cy, CELL_SIZE * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }

    // Enemigos
    ctx.fillStyle = '#ef4444'
    for (const enemyPos of game.enemyPositions) {
      const cx = enemyPos.col * CELL_SIZE + CELL_SIZE / 2
      const cy = enemyPos.row * CELL_SIZE + CELL_SIZE / 2
      ctx.beginPath()
      ctx.arc(cx, cy, CELL_SIZE * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }

    // Jugador
    const px = game.playerPos.col * CELL_SIZE + CELL_SIZE / 2
    const py = game.playerPos.row * CELL_SIZE + CELL_SIZE / 2
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.arc(px, py, CELL_SIZE * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }, [game.playerPos, game.enemyPositions, game.remainingItemPositions, layout, items, primaryColor, width, height])

  const CollectorIcon = iconForConcept(config.collectorIcon)
  const EnemyIcon = iconForConcept(config.enemyIcon)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-[720px] flex-col items-center p-5 sm:p-8">
        <header className="relative mb-4 w-full text-center">
          <button
            type="button"
            className="absolute left-0 top-0 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-text-h"
            onClick={onExit}
          >
            ← Salir
          </button>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">{title}</p>
          <h1 className="mt-1 flex items-center justify-center gap-2 text-[20px] tracking-tight text-text-h">
            <CollectorIcon className="h-5 w-5" style={{ color: primaryColor }} strokeWidth={2} />
            {config.collectorLabel}
            <span className="text-text">vs.</span>
            <EnemyIcon className="h-5 w-5 text-danger" strokeWidth={2} />
            {config.enemyLabel}
          </h1>
        </header>

        <div className="mx-auto mb-4 flex flex-wrap justify-center gap-4 rounded-2xl border border-border bg-code-bg px-6 py-3">
          <Stat label="Vidas" value={'❤️'.repeat(Math.max(0, game.lives))} />
          <Stat label="Objetos" value={`${game.collectedCount} / ${game.totalItems}`} />
          <Stat label="Puntos" value={String(game.score)} />
        </div>

        <div className="relative">
          {game.collectedCount > 0 && <ConfettiBurst trigger={game.collectedCount} />}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-xl border-2"
            style={{ borderColor: primaryColor, maxWidth: '100%', height: 'auto' }}
          />

          {game.phase === 'ready' && (
            <Overlay>
              <p className="mb-4 text-[14px] text-text-h">Usa las flechas o botones para moverte.</p>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={() => game.setDirection('RIGHT')}
              >
                Empezar
              </button>
            </Overlay>
          )}

          {game.phase === 'won' && (
            <Overlay celebrate>
              <h2 className="mb-2 text-[20px] text-text-h">¡Recolectaste todo!</h2>
              <p className="mb-4 text-[14px] text-text">Puntaje final: {game.score}</p>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={onExit}
              >
                Salir
              </button>
            </Overlay>
          )}

          {game.phase === 'lost' && (
            <Overlay>
              <h2 className="mb-2 text-[20px] text-text-h">Sin vidas</h2>
              <p className="mb-4 text-[14px] text-text">Puntaje final: {game.score}</p>
              <button
                type="button"
                className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                onClick={onExit}
              >
                Salir
              </button>
            </Overlay>
          )}
        </div>

        {game.lastCollected?.fact && game.phase === 'playing' && (
          <p
            key={game.lastCollected.itemId}
            className="mt-4 max-w-[420px] rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-center text-[13px] text-text-h"
          >
            💡 {game.lastCollected.fact}
          </p>
        )}

        <DirectionPad onPress={game.setDirection} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-1">
      <span className="text-[10px] uppercase tracking-wide text-text/70">{label}</span>
      <span className="mt-0.5 text-[16px] font-semibold text-text-h">{value}</span>
    </div>
  )
}

function Overlay({ children, celebrate }: { children: ReactNode; celebrate?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/60 p-5 text-center">
      {celebrate && <ConfettiBurst trigger="won" />}
      {children}
    </div>
  )
}

/** Controles táctiles para móvil; en desktop el teclado ya funciona vía el hook. */
function DirectionPad({ onPress }: { onPress: (direction: Direction) => void }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-1.5 sm:hidden">
      <span />
      <PadButton direction="UP" onPress={onPress} icon={ArrowUp} />
      <span />
      <PadButton direction="LEFT" onPress={onPress} icon={ArrowLeft} />
      <PadButton direction="DOWN" onPress={onPress} icon={ArrowDown} />
      <PadButton direction="RIGHT" onPress={onPress} icon={ArrowRight} />
    </div>
  )
}

function PadButton({
  direction,
  onPress,
  icon: Icon,
}: {
  direction: Direction
  onPress: (direction: Direction) => void
  icon: typeof ArrowUp
}) {
  return (
    <button
      type="button"
      className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-code-bg text-text-h active:bg-accent/10"
      onClick={() => onPress(direction)}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}
