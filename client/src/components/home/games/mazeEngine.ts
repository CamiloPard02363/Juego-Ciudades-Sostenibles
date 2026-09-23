import type { CellPosition, MazeCollectorItem, MazeLayoutDef } from './mazeCollectorTypes'

/**
 * Motor puro (sin React) del "Camión Eco-V": grid/colisiones, las 4 IAs de
 * nube distintas, generación de coleccionables y las reglas de puntuación.
 * Todo acá son funciones puras sobre datos planos — el hook
 * `useMazeCollectorGame` es el único que conoce `requestAnimationFrame`/
 * estado de React; este archivo se puede testear sin montar nada.
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export const DIRECTION_DELTAS: Record<Direction, CellPosition> = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

const ALL_DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']

export function isOpen(grid: number[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === 0
}

export function samePos(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col
}

export function manhattan(a: CellPosition, b: CellPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

function step(pos: CellPosition, direction: Direction): CellPosition {
  const delta = DIRECTION_DELTAS[direction]
  return { row: pos.row + delta.row, col: pos.col + delta.col }
}

/**
 * Si `cell` se salió del mapa por una columna en alguna de `tunnelRows`, la
 * envuelve al otro extremo — igual que los túneles clásicos. Un array vacío
 * (layout sin túnel) deja `cell` intacta, así que col=-1/col=cols quedan
 * fuera de rango y `isOpen` los rechaza normalmente.
 */
function wrapColumn(cell: CellPosition, cols: number, tunnelRows: readonly number[]): CellPosition {
  if (!tunnelRows.includes(cell.row)) return cell
  if (cell.col < 0) return { row: cell.row, col: cols - 1 }
  if (cell.col >= cols) return { row: cell.row, col: 0 }
  return cell
}

/** Igual que `wrapColumn`, pero tomando el layout completo — la forma que usa el hook. */
export function applyTeleport(layout: MazeLayoutDef, cell: CellPosition): CellPosition {
  return wrapColumn(cell, layout.cols, layout.tunnelRows)
}

/** Un paso en `direction` desde `pos`, ya envuelto por el túnel si corresponde. */
export function stepWithTeleport(
  pos: CellPosition,
  direction: Direction,
  cols: number,
  tunnelRows: readonly number[],
): CellPosition {
  return wrapColumn(step(pos, direction), cols, tunnelRows)
}

/** Direcciones abiertas desde `pos`, en el orden fijo de ALL_DIRECTIONS (determinismo para tests). */
export function openDirections(
  grid: number[][],
  pos: CellPosition,
  tunnelRows: readonly number[] = [],
): Direction[] {
  return ALL_DIRECTIONS.filter((direction) => {
    const next = wrapColumn(step(pos, direction), grid[0].length, tunnelRows)
    return isOpen(grid, next.row, next.col)
  })
}

/**
 * Cuadra un punto arbitrario (puede caer fuera del grid, ej. Pinky
 * apuntando "4 casillas por delante" cerca de un borde) a la celda abierta
 * más cercana — así ningún target queda inválido.
 */
export function clampToOpenCell(grid: number[][], target: CellPosition): CellPosition {
  if (isOpen(grid, target.row, target.col)) return target
  let best: CellPosition = { row: 0, col: 0 }
  let bestDistance = Infinity
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] !== 0) continue
      const distance = manhattan({ row, col }, target)
      if (distance < bestDistance) {
        bestDistance = distance
        best = { row, col }
      }
    }
  }
  return best
}

// ==================== IA de las 4 nubes ====================

export type GhostPersonality = 'CHASER' | 'AMBUSHER' | 'PATROLLER' | 'RANDOM'

/** Radio (en celdas) dentro del cual Polución Industrial abandona su patrulla y persigue. */
const PATROLLER_INTERCEPT_RADIUS = 5
/** Cuántas celdas por delante del camión apunta Gas Tóxico (Pinky). */
const AMBUSHER_LOOKAHEAD = 4

/**
 * Calcula la celda objetivo de una nube según su personalidad — la única
 * diferencia real entre las 4 IAs. El movimiento en sí (regla de "en cada
 * intersección, la vecina abierta que minimice la distancia al objetivo,
 * nunca reversa salvo callejón sin salida") es el mismo para las tres no
 * erráticas; ver `chooseGhostDirection`.
 */
export function computeGhostTarget(
  personality: GhostPersonality,
  grid: number[][],
  ghost: { pos: CellPosition; pivot: CellPosition },
  player: { pos: CellPosition; facing: Direction },
): CellPosition {
  switch (personality) {
    case 'CHASER':
      // Smog Gris (Blinky): persecución directa por distancia Manhattan —
      // el objetivo simplemente ES la casilla del camión.
      return player.pos
    case 'AMBUSHER': {
      // Gas Tóxico (Pinky): emboscada 4 casillas por delante de hacia
      // dónde va el camión, no de dónde está parado.
      const delta = DIRECTION_DELTAS[player.facing]
      const ahead = {
        row: player.pos.row + delta.row * AMBUSHER_LOOKAHEAD,
        col: player.pos.col + delta.col * AMBUSHER_LOOKAHEAD,
      }
      return clampToOpenCell(grid, ahead)
    }
    case 'PATROLLER': {
      // Polución Industrial (Inky): orbita su pivote fijo, pero si el
      // camión entra en su radio de cobertura, intercepta.
      const distanceToPivot = manhattan(player.pos, ghost.pivot)
      return distanceToPivot <= PATROLLER_INTERCEPT_RADIUS ? player.pos : ghost.pivot
    }
    case 'RANDOM':
      // Lluvia Ácida (Clyde): no tiene objetivo — decide al azar en
      // `chooseGhostDirection`.
      return ghost.pos
  }
}

/**
 * Regla clásica de fantasma de arcade: en un pasillo (una sola dirección
 * abierta que no sea reversa) sigue de largo; en una intersección (más de
 * una opción) elige la que minimiza la distancia euclidiana al objetivo;
 * nunca reversa a menos que sea la ÚNICA salida (callejón sin salida).
 * `RANDOM` y las nubes en modo "asustado" ignoran el objetivo y tiran una
 * dirección al azar entre las disponibles.
 */
export function chooseGhostDirection(
  grid: number[][],
  pos: CellPosition,
  facing: Direction,
  target: CellPosition,
  personality: GhostPersonality,
  frightened: boolean,
  random: () => number = Math.random,
  tunnelRows: readonly number[] = [],
): Direction {
  const reverse = OPPOSITE[facing]
  const candidates = openDirections(grid, pos, tunnelRows)
  const nonReverse = candidates.filter((direction) => direction !== reverse)
  const options = nonReverse.length > 0 ? nonReverse : candidates

  if (options.length === 0) return facing

  if (personality === 'RANDOM' || frightened) {
    return options[Math.floor(random() * options.length)]
  }

  let best = options[0]
  let bestDistance = Infinity
  for (const direction of options) {
    const next = stepWithTeleport(pos, direction, grid[0].length, tunnelRows)
    const distance = manhattan(next, target)
    if (distance < bestDistance) {
      bestDistance = distance
      best = direction
    }
  }
  return best
}

// ==================== Coleccionables ====================

export type CollectibleKind = 'PET' | 'POWER' | 'BAG' | 'BONUS'

export type Collectible = {
  id: string
  kind: CollectibleKind
  pos: CellPosition
  /** Solo BONUS: referencia al MazeCollectorItem configurado por quien creó el juego. */
  itemId?: string
}

export const POINTS_PET = 10
export const POINTS_POWER = 50
export const POINTS_BONUS = 500
/** 1ª, 2ª, 3ª, 4ª nube purificada en la misma racha — de ahí en adelante se repite el techo. */
export const COMBO_POINTS = [200, 400, 800, 1600]
export const POWER_MODE_MS = 6000
export const SLOW_TRAP_MS = 1000
export const SLOW_TRAP_FACTOR = 0.8
export const BONUS_LIFETIME_MS = 10000
export const POWER_PELLET_COUNT = 4
export const BAG_COUNT = 3
/** Fracción de PET recolectado que dispara la aparición del próximo E-Waste. */
export const BONUS_TRIGGER_STEP = 0.3

function cellKey(cell: CellPosition): string {
  return `${cell.row}:${cell.col}`
}

/**
 * Elige `count` celdas abiertas lo más repartidas posible entre sí (greedy:
 * cada nueva celda maximiza su distancia mínima a las ya elegidas) — así
 * las 4 Canecas de Energía y las bolsas de trampa no terminan apiladas en
 * una esquina del mapa.
 */
function pickSpreadCells(candidates: CellPosition[], count: number, avoid: Set<string>): CellPosition[] {
  const pool = candidates.filter((cell) => !avoid.has(cellKey(cell)))
  if (pool.length === 0) return []

  const chosen: CellPosition[] = [pool[Math.floor(Math.random() * pool.length)]]
  while (chosen.length < count && chosen.length < pool.length) {
    let best = pool[0]
    let bestMinDistance = -1
    for (const candidate of pool) {
      if (chosen.some((c) => samePos(c, candidate))) continue
      const minDistance = Math.min(...chosen.map((c) => manhattan(c, candidate)))
      if (minDistance > bestMinDistance) {
        bestMinDistance = minDistance
        best = candidate
      }
    }
    chosen.push(best)
  }
  return chosen
}

function allOpenCells(grid: number[][]): CellPosition[] {
  const cells: CellPosition[] = []
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] === 0) cells.push({ row, col })
    }
  }
  return cells
}

function closestCellTo(cells: CellPosition[], target: CellPosition): CellPosition {
  let best = cells[0]
  let bestDistance = Infinity
  for (const cell of cells) {
    const distance = manhattan(cell, target)
    if (distance < bestDistance) {
      bestDistance = distance
      best = cell
    }
  }
  return best
}

export type LevelBoard = {
  /** PET + Power Pellets — se limpian con "collectPickup"; ganar el nivel es vaciar esta lista. */
  pickups: Collectible[]
  bags: Collectible[]
  /** Centro del mapa — ahí aparece el próximo E-Waste disponible. */
  bonusSpawnPoint: CellPosition
}

/**
 * Arma un tablero nuevo (o "reinicia el laberinto" al ganar un nivel): PET
 * en cada calle libre que no esté ocupada por el arranque del jugador/las
 * nubes, 4 Canecas de Energía y 3 bolsas repartidas entre el resto —
 * aleatorio en cada llamada, tal como pidió el profesor ("los demás
 * objetos siempre serán aleatorios").
 */
export function buildLevelBoard(layout: MazeLayoutDef): LevelBoard {
  const reserved = new Set<string>([
    cellKey(layout.playerStart),
    ...layout.enemySpawns.map(cellKey),
  ])

  const open = allOpenCells(layout.grid)
  const powerCells = pickSpreadCells(open, POWER_PELLET_COUNT, reserved)
  powerCells.forEach((cell) => reserved.add(cellKey(cell)))

  const bagCells = pickSpreadCells(open, BAG_COUNT, reserved)
  bagCells.forEach((cell) => reserved.add(cellKey(cell)))

  const petCells = open.filter((cell) => !reserved.has(cellKey(cell)))

  const center = { row: Math.floor(layout.rows / 2), col: Math.floor(layout.cols / 2) }
  const bonusSpawnPoint = closestCellTo(open, center)

  const pickups: Collectible[] = [
    ...petCells.map((pos, index) => ({ id: `pet-${index}`, kind: 'PET' as const, pos })),
    ...powerCells.map((pos, index) => ({ id: `power-${index}`, kind: 'POWER' as const, pos })),
  ]
  const bags: Collectible[] = bagCells.map((pos, index) => ({ id: `bag-${index}`, kind: 'BAG' as const, pos }))

  return { pickups, bags, bonusSpawnPoint }
}

/** ¿Ya toca que aparezca el siguiente E-Waste? (30%, 60%, 90%... del PET original según cuántos objetos configuró el profesor). */
export function bonusThresholds(itemCount: number): number[] {
  const thresholds: number[] = []
  for (let i = 0; i < itemCount; i++) {
    // Redondeado a 2 decimales: 0.3 + 2*0.3 da 0.8999999999999999 en punto
    // flotante crudo, y eso rompe comparaciones de igualdad río abajo.
    const value = Math.round((BONUS_TRIGGER_STEP + i * BONUS_TRIGGER_STEP) * 100) / 100
    if (value >= 1) break
    thresholds.push(value)
  }
  return thresholds
}

export function comboPointsFor(comboIndex: number): number {
  return COMBO_POINTS[Math.min(comboIndex, COMBO_POINTS.length - 1)]
}

export type { MazeCollectorItem }
