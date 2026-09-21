import { GameInstructionsGate } from './GameInstructionsGate'
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

const CELL_SIZE = 36
/** Resolución del "sprite" lógico dentro de cada celda — entre más grande, más fino el pixel art (y más lento de dibujar). */
const SPRITE_GRID = 12
const PIXEL = CELL_SIZE / SPRITE_GRID

type SpriteMatrix = number[][]
type Palette = Record<number, string>

/** Dibuja una matriz de "pixeles" (0 = transparente) escalada para llenar una celda — la técnica clásica de sprites. */
function drawSprite(ctx: CanvasRenderingContext2D, matrix: SpriteMatrix, palette: Palette, originX: number, originY: number) {
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      const value = matrix[row][col]
      if (value === 0) continue
      ctx.fillStyle = palette[value] ?? '#000000'
      ctx.fillRect(Math.round(originX + col * PIXEL), Math.round(originY + row * PIXEL), PIXEL + 1, PIXEL + 1)
    }
  }
}

/**
 * Vehículo genérico visto desde arriba (parabrisas delante/detrás, cajón de
 * carga al centro, ruedas en las esquinas) — sirve para "camión de
 * reciclaje" y para cualquier otro recolector re-skinable.
 */
const COLLECTOR_SPRITE: SpriteMatrix = [
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 1, 1, 4, 4, 1, 1, 2, 2, 1],
  [1, 2, 2, 1, 1, 4, 4, 1, 1, 2, 2, 1],
  [1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3],
  [0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
]

/**
 * Nube de humo/contaminación: silueta redondeada y abultada (sin el borde
 * ondulado de un fantasma clásico, que confundía el enemigo con algo
 * simpático) con un par de ojos tenues y parches de "smog" más oscuros —
 * el enemigo sigue siendo la amenaza ambiental original, no un fantasma.
 */
const ENEMY_SPRITE: SpriteMatrix = [
  [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1],
  [1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 3, 1, 1, 1, 1, 1, 1, 3, 1, 1],
  [1, 1, 1, 1, 3, 1, 1, 3, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
]

/** Bolsa/paquete coleccionable con "nudo" arriba — se colorea con item.color. */
const ITEM_SPRITE: SpriteMatrix = [
  [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0],
  [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 3, 1, 1, 1, 1, 3, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 3, 1, 1, 1, 1, 3, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],
]

/**
 * Edificio de ladrillo con sombreado por banda (más claro arriba, más
 * oscuro abajo) — imita luz cayendo desde arriba sin necesitar 3D real,
 * y da la sensación de volumen que pedía la referencia.
 */
const BUILDING_SPRITE: SpriteMatrix = [
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [5, 5, 5, 6, 5, 5, 5, 6, 5, 5, 5, 6],
  [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  [2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 2, 2],
  [2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 2, 2],
  [1, 1, 1, 6, 1, 1, 1, 6, 1, 1, 1, 6],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [3, 3, 1, 1, 1, 3, 3, 1, 1, 1, 3, 3],
  [3, 3, 1, 1, 1, 3, 3, 1, 1, 1, 3, 3],
  [1, 1, 1, 6, 1, 1, 1, 6, 1, 1, 1, 6],
  [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

/** Árbol sobre césped — decoración de las celdas de parque en el layout CITY. */
const TREE_SPRITE: SpriteMatrix = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 4, 4, 4, 4, 4, 4, 0, 1, 1],
  [1, 0, 4, 4, 3, 3, 3, 3, 4, 4, 0, 1],
  [1, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 1],
  [1, 4, 3, 3, 3, 3, 3, 3, 3, 3, 4, 1],
  [1, 0, 4, 3, 3, 3, 3, 3, 3, 4, 0, 1],
  [1, 1, 0, 4, 4, 4, 4, 4, 4, 0, 1, 1],
  [1, 1, 1, 0, 2, 2, 2, 2, 0, 1, 1, 1],
  [1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1],
  [1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

/** Aclara (percent > 0) u oscurece (percent < 0) un color hex — sombreado barato sin gradientes reales. */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amount = Math.round(2.55 * percent)
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0x00ff) + amount)
  const b = clamp((num & 0x0000ff) + amount)
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`
}

/** Agrega las bandas 5 (tope iluminado) y 6 (base en sombra) derivadas del color base — así BUILDING_SPRITE tiene volumen. */
function withShading(base: Palette): Palette {
  return { ...base, 5: shade(base[1], 25), 6: shade(base[1], -30) }
}

/** Paleta de edificios variada — "muy colorido" en vez de un gris uniforme; una manzana entera comparte color (ver cityBuildingPalette). */
const BUILDING_PALETTES: Palette[] = [
  { 1: '#b45309', 2: '#fde68a', 3: '#78350f', 4: '#92400e' },
  { 1: '#1d4ed8', 2: '#bfdbfe', 3: '#1e3a8a', 4: '#1e40af' },
  { 1: '#059669', 2: '#a7f3d0', 3: '#064e3b', 4: '#047857' },
  { 1: '#7c3aed', 2: '#ddd6fe', 3: '#4c1d95', 4: '#6d28d9' },
  { 1: '#dc2626', 2: '#fecaca', 3: '#7f1d1d', 4: '#b91c1c' },
  { 1: '#0891b2', 2: '#a5f3fc', 3: '#164e63', 4: '#0e7490' },
].map(withShading)

/** Cuatro tipos de contaminación — uno por punto de aparición de enemigos, en vez de un arcoíris de fantasmas de juguete. */
const ENEMY_PALETTES: Palette[] = [
  { 1: '#57534e', 2: '#18181b', 3: '#292524' },
  { 1: '#65a30d', 2: '#1a2e05', 3: '#3f6212' },
  { 1: '#7c3aed', 2: '#2e1065', 3: '#4c1d95' },
  { 1: '#c2410c', 2: '#431407', 3: '#7c2d12' },
]

/** Hash determinista y estable (mismo bloque = mismo color siempre, sin parpadeo entre frames). */
function hashCell(row: number, col: number): number {
  return Math.abs(row * 31 + col * 17)
}

/**
 * Espaciado de calles del layout CITY (ver buildCityMaze en
 * mazeCollectorTypes.ts) — se necesita acá para que todas las celdas de una
 * misma manzana de 3x3 compartan un solo color en vez de quedar cada celda
 * pintada por separado (lo que se veía como un mosaico al azar).
 */
const CITY_STREET_SPACING = 4

function cityBuildingPalette(row: number, col: number): Palette {
  const blockRow = Math.floor((row - 1) / CITY_STREET_SPACING)
  const blockCol = Math.floor((col - 1) / CITY_STREET_SPACING)
  return BUILDING_PALETTES[hashCell(blockRow, blockCol) % BUILDING_PALETTES.length]
}

/** Para layouts que no son CITY, una sola paleta calmada en vez de mosaico multicolor — no son "ciudad", son pared abstracta. */
function wallPalette(primaryColor: string): Palette {
  return withShading({ 1: '#374151', 2: primaryColor, 3: shade(primaryColor, -20), 4: '#111827' })
}

function enemyPalette(index: number): Palette {
  return ENEMY_PALETTES[index % ENEMY_PALETTES.length]
}

const ROAD_BASE = '#4b5563'
const ROAD_PALETTE: Palette = { 1: ROAD_BASE }
const DOT_COLOR = '#facc15'
const GRASS_BASE = '#166534'
const TREE_PALETTE: Palette = { 1: GRASS_BASE, 2: '#78350f', 3: '#166534', 4: '#22c55e' }
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)'

function itemPalette(color: string): Palette {
  return { 1: color, 2: '#111827', 3: '#ffffff' }
}

/** El cuerpo del vehículo usa el color temático del juego — así sigue siendo re-skinable, no un camión verde fijo. */
function collectorPalette(primaryColor: string): Palette {
  return { 1: primaryColor, 2: '#7dd3fc', 3: '#1f2937', 4: shade(primaryColor, -30) }
}

export function MazeCollectorGame(props: MazeCollectorGameProps) {
  return <GameInstructionsGate kind={'MAZE_COLLECTOR'}><MazeCollectorSession {...props} /></GameInstructionsGate>
}

function MazeCollectorSession({ title, primaryColor, layout, items, config, onExit }: MazeCollectorGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useMazeCollectorGame({ layout, items, config })
  const isCity = config.layout === 'CITY'

  const width = layout.cols * CELL_SIZE
  const height = layout.rows * CELL_SIZE

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Sin antialiasing: es lo que hace que los sprites se vean "de píxeles"
    // en vez de vectores suavizados.
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)

    const decoratedCells = new Set(layout.decorations.map((d) => `${d.row}:${d.col}`))

    const wallColors = wallPalette(primaryColor)

    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < layout.cols; col++) {
        const x = col * CELL_SIZE
        const y = row * CELL_SIZE

        if (layout.grid[row][col] === 1) {
          drawSprite(ctx, BUILDING_SPRITE, isCity ? cityBuildingPalette(row, col) : wallColors, x, y)
          continue
        }

        if (isCity && decoratedCells.has(`${row}:${col}`)) {
          drawSprite(ctx, TREE_SPRITE, TREE_PALETTE, x, y)
          continue
        }

        // Calle/camino: base + bordillo (banda inferior más oscura, da
        // sensación de piso/profundidad) + puntito estilo arcade.
        ctx.fillStyle = ROAD_PALETTE[1]
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        ctx.fillStyle = shade(ROAD_BASE, -20)
        ctx.fillRect(x, y + CELL_SIZE - PIXEL, CELL_SIZE, PIXEL)
        ctx.fillStyle = DOT_COLOR
        ctx.fillRect(x + CELL_SIZE / 2 - PIXEL / 2, y + CELL_SIZE / 2 - PIXEL / 2, PIXEL, PIXEL)
      }
    }

    // Sombra elíptica bajo objetos y camión: "planta" el sprite en el piso
    // en vez de flotar sobre un fondo plano — el truco de profundidad más
    // barato que existe en pixel art.
    function drawGroundShadow(col: number, row: number) {
      const canvasCtx = ctx as CanvasRenderingContext2D
      canvasCtx.fillStyle = SHADOW_COLOR
      canvasCtx.beginPath()
      canvasCtx.ellipse(
        col * CELL_SIZE + CELL_SIZE / 2,
        row * CELL_SIZE + CELL_SIZE - PIXEL * 1.5,
        CELL_SIZE * 0.32,
        PIXEL * 1.2,
        0,
        0,
        Math.PI * 2,
      )
      canvasCtx.fill()
    }

    for (const entry of game.remainingItemPositions) {
      const item = items.find((i) => i.itemId === entry.itemId)
      if (!item) continue
      drawGroundShadow(entry.position.col, entry.position.row)
      drawSprite(ctx, ITEM_SPRITE, itemPalette(item.color), entry.position.col * CELL_SIZE, entry.position.row * CELL_SIZE)
    }

    // Los enemigos son nubes flotando, no vehículos: sombra más tenue y sin
    // "aterrizar" del todo, para que se lean como algo en el aire.
    game.enemyPositions.forEach((enemyPos) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      ctx.beginPath()
      ctx.ellipse(
        enemyPos.col * CELL_SIZE + CELL_SIZE / 2,
        enemyPos.row * CELL_SIZE + CELL_SIZE - PIXEL,
        CELL_SIZE * 0.28,
        PIXEL,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
    game.enemyPositions.forEach((enemyPos, index) => {
      drawSprite(ctx, ENEMY_SPRITE, enemyPalette(index), enemyPos.col * CELL_SIZE, enemyPos.row * CELL_SIZE)
    })

    drawGroundShadow(game.playerPos.col, game.playerPos.row)
    drawSprite(ctx, COLLECTOR_SPRITE, collectorPalette(primaryColor), game.playerPos.col * CELL_SIZE, game.playerPos.row * CELL_SIZE)
  }, [game.playerPos, game.enemyPositions, game.remainingItemPositions, layout, items, primaryColor, width, height, isCity])

  const CollectorIcon = iconForConcept(config.collectorIcon)
  const EnemyIcon = iconForConcept(config.enemyIcon)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-[900px] flex-col items-center p-5 sm:p-8">
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

        <div className="mx-auto mb-4 flex flex-wrap justify-center gap-4 rounded-2xl border border-border bg-code-bg px-6 py-3 font-mono">
          <Stat label="Vidas" value={'🚛'.repeat(Math.max(0, game.lives))} />
          <Stat label="Objetos" value={`${game.collectedCount} / ${game.totalItems}`} />
          <Stat label="Puntos" value={String(game.score)} />
        </div>

        <div
          className="relative w-full overflow-x-auto rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 60%, #e0f2fe 100%)' }}
        >
          {game.collectedCount > 0 && <ConfettiBurst trigger={game.collectedCount} />}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="mx-auto block rounded-xl border-2 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)]"
            style={{ borderColor: primaryColor, imageRendering: 'pixelated', maxWidth: '100%', height: 'auto' }}
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
