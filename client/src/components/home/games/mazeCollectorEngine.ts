import type { CellPosition, WasteType, ZoneType } from './mazeCollectorTypes'
import { findPath } from './mazeCollectorPathfinding'

/** Puntaje por tipo de residuo — el vidrio vale más porque es el más costoso de reciclar mal. */
export const WASTE_POINTS: Record<WasteType, number> = {
  PLASTIC: 100,
  PAPER: 100,
  GLASS: 150,
}
export const DEFAULT_ITEM_POINTS = 100

export function pointsForItem(wasteType: WasteType | undefined): number {
  return wasteType ? WASTE_POINTS[wasteType] : DEFAULT_ITEM_POINTS
}

/** Energía que decae por tick de jugador durante 'playing'. A -0.4/tick con TICK_MS=260 se agota en ~100s de juego activo. */
export const ENERGY_DECAY_PER_TICK = 0.4
export const ENERGY_MAX = 100
/** Bono de energía al acertar una pregunta de zona (Escuela o Centro de Reciclaje). */
export const ZONE_QUESTION_ENERGY_BONUS = 20

/** Duración del power-up "Super-Recogida" en ticks de jugador (~9-10s con TICK_MS=260). */
export const SUPER_COLLECT_TICKS = 40

/** Distancia Manhattan a partir de la cual un enemigo activa A* real en vez de la heurística barata. */
export const DETECTION_RADIUS = 6
/** Cada cuántos ticks de enemigo se recalcula la ruta A* (no en cada tick de movimiento). */
export const PATH_RECALC_INTERVAL = 3

function isOpen(grid: number[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === 0
}

function samePos(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col
}

const DIRECTION_DELTAS: readonly CellPosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

function openNeighbors(grid: number[][], pos: CellPosition): CellPosition[] {
  return DIRECTION_DELTAS.map((delta) => ({ row: pos.row + delta.row, col: pos.col + delta.col })).filter((next) =>
    isOpen(grid, next.row, next.col),
  )
}

function manhattan(a: CellPosition, b: CellPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

/** Heurística barata (sin A*): 70% el vecino más cercano al objetivo, 30% al azar — usada fuera del radio de detección. */
function chooseGreedyMove(grid: number[][], from: CellPosition, target: CellPosition, preferFar: boolean): CellPosition {
  const neighbors = openNeighbors(grid, from)
  if (neighbors.length === 0) return from

  if (Math.random() < 0.3) {
    return neighbors[Math.floor(Math.random() * neighbors.length)]
  }

  let best = neighbors[0]
  let bestDistance = preferFar ? -Infinity : Infinity
  for (const candidate of neighbors) {
    const distance = manhattan(candidate, target)
    if ((preferFar && distance > bestDistance) || (!preferFar && distance < bestDistance)) {
      bestDistance = distance
      best = candidate
    }
  }
  return best
}

export type EnemyRuntimeState = {
  pos: CellPosition
  /** Ruta A* vigente (si la hay), cacheada entre recálculos según PATH_RECALC_INTERVAL. */
  path: CellPosition[] | null
  pathTargetPos: CellPosition | null
  ticksSincePathRecalc: number
}

export function createEnemyRuntimeState(pos: CellPosition): EnemyRuntimeState {
  return { pos, path: null, pathTargetPos: null, ticksSincePathRecalc: Infinity }
}

/**
 * Decide el próximo movimiento de un enemigo. Fuera del radio de detección
 * usa la heurística barata (como antes); dentro del radio, corre A* real
 * hacia el jugador (o, en modo flee, hacia la celda alcanzable más lejana
 * dentro de su radio) con throttle de recálculo para no correr A* completo
 * en cada tick para hasta 4 enemigos simultáneos.
 */
export function chooseEnemyMove(grid: number[][], enemy: EnemyRuntimeState, playerPos: CellPosition, flee: boolean): CellPosition {
  const distance = manhattan(enemy.pos, playerPos)

  if (distance > DETECTION_RADIUS) {
    enemy.path = null
    return chooseGreedyMove(grid, enemy.pos, playerPos, flee)
  }

  const target = flee ? farthestReachableCell(grid, enemy.pos, playerPos) : playerPos
  const shouldRecalc =
    !enemy.path ||
    enemy.path.length <= 1 ||
    enemy.ticksSincePathRecalc >= PATH_RECALC_INTERVAL ||
    !enemy.pathTargetPos ||
    manhattan(enemy.pathTargetPos, target) > 2

  if (shouldRecalc) {
    enemy.path = findPath(grid, enemy.pos, target)
    enemy.pathTargetPos = target
    enemy.ticksSincePathRecalc = 0
  } else {
    enemy.ticksSincePathRecalc++
  }

  if (!enemy.path || enemy.path.length < 2) {
    return chooseGreedyMove(grid, enemy.pos, target, flee)
  }

  const next = enemy.path[1]
  enemy.path = enemy.path.slice(1)
  return next
}

/** En modo huida: la celda abierta dentro del radio de detección que maximiza la distancia Manhattan al jugador. */
function farthestReachableCell(grid: number[][], from: CellPosition, playerPos: CellPosition): CellPosition {
  let best = from
  let bestDistance = manhattan(from, playerPos)
  for (let row = Math.max(0, from.row - DETECTION_RADIUS); row <= Math.min(grid.length - 1, from.row + DETECTION_RADIUS); row++) {
    for (let col = Math.max(0, from.col - DETECTION_RADIUS); col <= Math.min(grid[0].length - 1, from.col + DETECTION_RADIUS); col++) {
      if (!isOpen(grid, row, col)) continue
      const candidate = { row, col }
      if (manhattan(from, candidate) > DETECTION_RADIUS) continue
      const distance = manhattan(candidate, playerPos)
      if (distance > bestDistance) {
        bestDistance = distance
        best = candidate
      }
    }
  }
  return best
}

export type TriggerZoneType = Extract<ZoneType, 'school' | 'recycling_center'>

/** Zonas que disparan una pregunta pedagógica al entrar (Escuela y Centro de Reciclaje). */
export const TRIGGER_ZONES: readonly TriggerZoneType[] = ['school', 'recycling_center']

export function isTriggerZone(zone: ZoneType | null | undefined): zone is TriggerZoneType {
  return zone != null && (TRIGGER_ZONES as readonly ZoneType[]).includes(zone)
}

export { samePos }
