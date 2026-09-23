import { GameInstructionsGate } from './GameInstructionsGate'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Zap } from 'lucide-react'
import type { MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef, CellPosition } from './mazeCollectorTypes'
import { iconForConcept } from './mazeCollectorTypes'
import { useMazeCollectorGame } from './useMazeCollectorGame'
import type { Direction } from './useMazeCollectorGame'
import { EcoTruckSprite } from './EcoTruckSprite'
import { PollutionGhostSprite } from './PollutionGhostSprite'
import { BonusSprite, PetSprite, PowerPelletSprite, TrashBagSprite } from './mazeCollectibleSprites'
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

/** Aclara (percent > 0) u oscurece (percent < 0) un color hex. */
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amount = Math.round(2.55 * percent)
  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const r = clamp((num >> 16) + amount)
  const g = clamp(((num >> 8) & 0x00ff) + amount)
  const b = clamp((num & 0x0000ff) + amount)
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`
}

type BuildingPalette = { base: string; light: string; dark: string }

/** Paleta de edificios variada — cada manzana comparte un color (ver cityBuildingPalette). */
const BUILDING_PALETTES: string[] = ['#b45309', '#1d4ed8', '#059669', '#7c3aed', '#dc2626', '#0891b2']

function buildingPalette(base: string): BuildingPalette {
  return { base, light: shade(base, 25), dark: shade(base, -35) }
}

/** Hash determinista (mismo bloque = mismo color siempre). */
function hashCell(row: number, col: number): number {
  return Math.abs(row * 31 + col * 17)
}

const CITY_STREET_SPACING = 4

function cityBuildingPalette(row: number, col: number): BuildingPalette {
  const blockRow = Math.floor((row - 1) / CITY_STREET_SPACING)
  const blockCol = Math.floor((col - 1) / CITY_STREET_SPACING)
  return buildingPalette(BUILDING_PALETTES[hashCell(blockRow, blockCol) % BUILDING_PALETTES.length])
}

function wallPalette(primaryColor: string): BuildingPalette {
  return buildingPalette(primaryColor)
}

export function MazeCollectorGame(props: MazeCollectorGameProps) {
  return (
    <GameInstructionsGate kind={'MAZE_COLLECTOR'}>
      <MazeCollectorSession {...props} />
    </GameInstructionsGate>
  )
}

function MazeCollectorSession({ title, primaryColor, layout, items, config, onExit }: MazeCollectorGameProps) {
  const game = useMazeCollectorGame({ layout, items, config })
  const isCity = config.layout === 'CITY'

  const width = layout.cols * CELL_SIZE
  const height = layout.rows * CELL_SIZE
  const decoratedCells = new Set(layout.decorations.map((d) => `${d.row}:${d.col}`))
  const wallColors = wallPalette(primaryColor)

  const CollectorIcon = iconForConcept(config.collectorIcon)
  const energized = game.energizedRemainingMs > 0
  const energyWarning = energized && game.energizedRemainingMs < 2000

  function pixelPos(cell: { row: number; col: number }) {
    return { left: cell.col * CELL_SIZE, top: cell.row * CELL_SIZE }
  }

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
            <span className="text-danger">nubes de contaminación</span>
          </h1>
        </header>

        <div className="mx-auto mb-3 flex flex-wrap justify-center gap-4 rounded-2xl border border-border bg-code-bg px-6 py-3 font-mono">
          <Stat label="Batería" value={'🔋'.repeat(Math.max(0, game.lives))} />
          <Stat label="Nivel" value={String(game.level)} />
          <Stat label="PET" value={`${game.collectedPet} / ${game.totalPet}`} />
          <Stat label="Puntos" value={String(game.score)} />
        </div>

        <GhostLegend />

        {energized && (
          <div className="mb-3 flex w-full max-w-[420px] items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5">
            <Zap className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
                style={{ width: `${Math.min(100, (game.energizedRemainingMs / 6000) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-accent">Purificador</span>
          </div>
        )}

        <div
          className="relative w-full overflow-x-auto rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 60%, #e0f2fe 100%)' }}
        >
          {game.collectedPet > 0 && <ConfettiBurst trigger={game.collectedPet} />}

          <div
            className="relative mx-auto overflow-hidden rounded-xl border-2 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)]"
            style={{ width, height, borderColor: primaryColor, maxWidth: '100%' }}
          >
            {/* Capa 1: laberinto estático (grid CSS, sin costo por frame). */}
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${layout.rows}, ${CELL_SIZE}px)`,
              }}
            >
              {layout.grid.map((rowCells, row) =>
                rowCells.map((cell, col) => {
                  const key = `${row}:${col}`
                  if (cell === 1) {
                    const palette = isCity ? cityBuildingPalette(row, col) : wallColors
                    return (
                      <div
                        key={key}
                        style={{
                          background: `linear-gradient(160deg, ${palette.light}, ${palette.base} 55%, ${palette.dark})`,
                          border: `1px solid ${palette.dark}`,
                        }}
                      >
                        <div
                          className="h-full w-full animate-[maze-window-glow_3s_ease-in-out_infinite]"
                          style={{
                            animationDelay: `${(hashCell(row, col) % 20) * 0.15}s`,
                            background:
                              'repeating-linear-gradient(0deg, transparent 0 6px, rgba(254,240,138,0.5) 6px 8px)',
                            mixBlendMode: 'overlay',
                          }}
                        />
                      </div>
                    )
                  }
                  if (isCity && decoratedCells.has(key)) {
                    return (
                      <div key={key} className="relative flex items-center justify-center bg-[#166534]">
                        <div
                          className="animate-[maze-tree-sway_2.4s_ease-in-out_infinite]"
                          style={{ animationDelay: `${(hashCell(row, col) % 10) * 0.2}s`, fontSize: CELL_SIZE * 0.6 }}
                        >
                          🌳
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={key} className="relative bg-[#4b5563]">
                      <span
                        className="absolute left-1/2 top-1/2 block h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#facc15] animate-[maze-road-dot-pulse_1.6s_ease-in-out_infinite]"
                        style={{ animationDelay: `${(hashCell(row, col) % 12) * 0.12}s` }}
                      />
                    </div>
                  )
                }),
              )}
            </div>

            {/* Capa 2: coleccionables — solo los que quedan, cada uno en su celda lógica (no interpolan, no se mueven). */}
            {game.pickups.map((pickup) => {
              const { left, top } = pixelPos(pickup.pos)
              return (
                <div key={pickup.id} className="absolute flex items-center justify-center" style={{ left, top, width: CELL_SIZE, height: CELL_SIZE }}>
                  {pickup.kind === 'PET' ? <PetSprite size={CELL_SIZE * 0.5} /> : <PowerPelletSprite size={CELL_SIZE * 0.6} />}
                </div>
              )
            })}
            {game.bags.map((bag) => {
              const { left, top } = pixelPos(bag.pos)
              return (
                <div key={bag.id} className="absolute flex items-center justify-center" style={{ left, top, width: CELL_SIZE, height: CELL_SIZE }}>
                  <TrashBagSprite size={CELL_SIZE * 0.65} />
                </div>
              )
            })}
            {game.bonus && <BonusMarker bonus={game.bonus} pixelPos={pixelPos} />}

            {/* Capa 3: entidades vivas — posición interpolada por el motor cada frame. */}
            {game.ghosts.map((ghost) => (
              <div
                key={ghost.id}
                className="absolute"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  transform: `translate3d(${ghost.col * CELL_SIZE}px, ${ghost.row * CELL_SIZE}px, 0)`,
                }}
              >
                <PollutionGhostSprite personality={ghost.personality} mode={ghost.mode} size={CELL_SIZE} warning={energyWarning} />
              </div>
            ))}

            <div
              className="absolute"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                transform: `translate3d(${game.player.col * CELL_SIZE}px, ${game.player.row * CELL_SIZE}px, 0)`,
              }}
            >
              <EcoTruckSprite facing={game.player.facing} size={CELL_SIZE} energized={energized} />
            </div>
          </div>

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

          {game.phase === 'levelup' && (
            <Overlay celebrate>
              <h2 className="mb-1 animate-[maze-levelup-pop_0.4s_cubic-bezier(0.16,1,0.3,1)] text-[20px] text-text-h">
                ¡Laberinto limpio!
              </h2>
              <p className="text-[14px] text-text">Nivel {game.level + 1} — las nubes vienen más rápido…</p>
            </Overlay>
          )}

          {game.phase === 'lost' && (
            <Overlay>
              <h2 className="mb-2 text-[20px] text-text-h">Sin batería</h2>
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

function BonusMarker({
  bonus,
  pixelPos,
}: {
  bonus: { pos: CellPosition; item: MazeCollectorItem }
  pixelPos: (cell: CellPosition) => { left: number; top: number }
}) {
  const { left, top } = pixelPos(bonus.pos)
  return (
    <div
      className="absolute flex flex-col items-center justify-center"
      style={{ left, top, width: CELL_SIZE, height: CELL_SIZE }}
      title={bonus.item.label}
    >
      <BonusSprite size={CELL_SIZE * 0.75} />
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

const GHOST_LEGEND: Array<{ label: string; color: string }> = [
  { label: 'Smog Gris', color: '#78716c' },
  { label: 'Gas Tóxico', color: '#a3e635' },
  { label: 'Polución Industrial', color: '#b45309' },
  { label: 'Lluvia Ácida', color: '#eab308' },
]

function GhostLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
      {GHOST_LEGEND.map((entry) => (
        <span key={entry.label} className="flex items-center gap-1.5 text-[11px] text-text">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
          {entry.label}
        </span>
      ))}
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
