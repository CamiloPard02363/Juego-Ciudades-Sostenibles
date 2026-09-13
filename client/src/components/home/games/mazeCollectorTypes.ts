import { DOMINO_ICON_LABELS, iconForConcept } from './dominoTypes'

export { DOMINO_ICON_LABELS as MAZE_ICON_LABELS, iconForConcept }

/** Un objeto coleccionable del laberinto: reemplaza la "pastilla" genérica por un concepto temático. */
export type MazeCollectorItem = {
  itemId: string
  label: string
  /** Clave del catálogo DOMINO_ICONS (reutilizado tal cual, ver dominoTypes.ts). */
  icon: string
  color: string
  fact?: string
}

export type MazeLayout = 'CLASSIC' | 'CROSS' | 'SPIRAL' | 'CITY'

export type MazeCollectorConfig = {
  layout: MazeLayout
  lives: number
  enemySpeed: number
  collectorLabel: string
  collectorIcon: string
  enemyLabel: string
  enemyIcon: string
}

export const DEFAULT_MAZE_CONFIG: MazeCollectorConfig = {
  layout: 'CLASSIC',
  lives: 3,
  enemySpeed: 2,
  collectorLabel: 'Recolector',
  collectorIcon: 'target',
  enemyLabel: 'Enemigo',
  enemyIcon: 'cloud',
}

export const MIN_MAZE_ITEMS = 4
export const MAX_MAZE_ITEMS = 16

export type CellPosition = { row: number; col: number }

export type MazeLayoutDef = {
  cols: number
  rows: number
  /** 0 = camino libre, 1 = pared. */
  grid: number[][]
  playerStart: CellPosition
  enemySpawns: CellPosition[]
  /** Celdas candidatas para colocar objetos coleccionables, en orden fijo. */
  itemSlots: CellPosition[]
  /** Celdas puramente decorativas (árboles/parques) — no afectan colisión ni movimiento. */
  decorations: CellPosition[]
}

const COLS = 15
const ROWS = 11

function emptyGrid(cols: number, rows: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0))
}

function addBorder(grid: number[][]): void {
  const rows = grid.length
  const cols = grid[0].length
  for (let c = 0; c < cols; c++) {
    grid[0][c] = 1
    grid[rows - 1][c] = 1
  }
  for (let r = 0; r < rows; r++) {
    grid[r][0] = 1
    grid[r][cols - 1] = 1
  }
}

/**
 * "Peine" de dientes que nacen alternadamente del borde superior o inferior
 * (o izquierdo/derecho, según orientación) sin llegar nunca a la fila/columna
 * central — esa fila/columna central queda siempre abierta de punta a punta,
 * lo que garantiza que el laberinto entero quede conectado sin necesidad de
 * un solver: cualquier celda puede llegar a la fila/columna central bordeando
 * su diente, y desde ahí a cualquier otra.
 */
function buildCombMaze(cols: number, rows: number, orientation: 'vertical' | 'horizontal'): number[][] {
  const grid = emptyGrid(cols, rows)
  addBorder(grid)

  if (orientation === 'vertical') {
    const spineRow = Math.floor(rows / 2)
    let toothIndex = 0
    for (let c = 2; c < cols - 1; c += 2) {
      const attachTop = toothIndex % 2 === 0
      if (attachTop) {
        for (let r = 1; r <= spineRow - 1; r++) grid[r][c] = 1
      } else {
        for (let r = spineRow + 1; r <= rows - 2; r++) grid[r][c] = 1
      }
      toothIndex++
    }
  } else {
    const spineCol = Math.floor(cols / 2)
    let toothIndex = 0
    for (let r = 2; r < rows - 1; r += 2) {
      const attachLeft = toothIndex % 2 === 0
      if (attachLeft) {
        for (let c = 1; c <= spineCol - 1; c++) grid[r][c] = 1
      } else {
        for (let c = spineCol + 1; c <= cols - 2; c++) grid[r][c] = 1
      }
      toothIndex++
    }
  }

  return grid
}

/**
 * Cuadrícula de calles tipo ciudad: una calle cada `STREET_SPACING` filas y
 * columnas, dejando manzanas sólidas (edificios) entre ellas. Al ser una
 * rejilla completa, cualquier calle conecta con cualquier otra por al menos
 * dos rutas distintas — el "múltiples caminos" que no dan los peines ni la
 * cruz. Grid grande a propósito: es la ambientación de una ciudad, no un
 * laberinto abstracto.
 */
function buildCityMaze(cols: number, rows: number): number[][] {
  const STREET_SPACING = 4
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1))

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (r % STREET_SPACING === 0 || c % STREET_SPACING === 0) grid[r][c] = 0
    }
  }

  addBorder(grid)
  return grid
}

/** Una franja horizontal y una vertical, cruzadas por el centro; el resto son paredes sólidas. */
function buildCrossMaze(cols: number, rows: number): number[][] {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1))

  const bandRowStart = Math.floor(rows / 2) - 1
  const bandRowEnd = Math.floor(rows / 2) + 1
  const bandColStart = Math.floor(cols / 2) - 1
  const bandColEnd = Math.floor(cols / 2) + 1

  for (let r = bandRowStart; r <= bandRowEnd; r++) {
    for (let c = 1; c < cols - 1; c++) grid[r][c] = 0
  }
  for (let c = bandColStart; c <= bandColEnd; c++) {
    for (let r = 1; r < rows - 1; r++) grid[r][c] = 0
  }

  addBorder(grid)
  return grid
}

function openCells(grid: number[][]): CellPosition[] {
  const cells: CellPosition[] = []
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] === 0) cells.push({ row, col })
    }
  }
  return cells
}

function closestOpenCell(grid: number[][], targetRow: number, targetCol: number, exclude: CellPosition[]): CellPosition {
  const candidates = openCells(grid).filter(
    (cell) => !exclude.some((used) => used.row === cell.row && used.col === cell.col),
  )
  let best = candidates[0]
  let bestDistance = Infinity
  for (const cell of candidates) {
    const distance = Math.abs(cell.row - targetRow) + Math.abs(cell.col - targetCol)
    if (distance < bestDistance) {
      bestDistance = distance
      best = cell
    }
  }
  return best
}

/** Reparte, de forma fija y determinista, dónde nace el jugador, dónde nacen los enemigos y qué celdas pueden llevar un objeto. */
function deriveSlots(grid: number[][], cols: number, rows: number, maxItems: number, includeDecorations: boolean) {
  const used: CellPosition[] = []

  const playerStart = closestOpenCell(grid, Math.floor(rows / 2), Math.floor(cols / 2), used)
  used.push(playerStart)

  const corners: Array<[number, number]> = [
    [1, 1],
    [1, cols - 2],
    [rows - 2, 1],
    [rows - 2, cols - 2],
  ]
  const enemySpawns = corners.map(([r, c]) => {
    const spawn = closestOpenCell(grid, r, c, used)
    used.push(spawn)
    return spawn
  })

  const remaining = openCells(grid).filter((cell) => !used.some((u) => u.row === cell.row && u.col === cell.col))
  const stride = Math.max(1, Math.floor(remaining.length / maxItems))
  const itemSlots: CellPosition[] = []
  for (let i = 0; i < remaining.length && itemSlots.length < maxItems; i += stride) {
    itemSlots.push(remaining[i])
    used.push(remaining[i])
  }

  // El resto de celdas libres son candidatas a decoración (árboles/parques):
  // solo tiene sentido en el layout CITY — en los demás (Cruz, Espiral,
  // Clásico) no hay ambientación de ciudad, así que no se les fuerza césped.
  const decorations: CellPosition[] = []
  if (includeDecorations) {
    const decorationCandidates = openCells(grid).filter(
      (cell) => !used.some((u) => u.row === cell.row && u.col === cell.col),
    )
    const decorationStride = Math.max(1, Math.floor(decorationCandidates.length / 24))
    for (let i = 0; i < decorationCandidates.length; i += decorationStride) {
      decorations.push(decorationCandidates[i])
    }
  }

  return { playerStart, enemySpawns, itemSlots, decorations }
}

function buildLayout(grid: number[][], cols: number, rows: number, includeDecorations = false): MazeLayoutDef {
  const { playerStart, enemySpawns, itemSlots, decorations } = deriveSlots(
    grid,
    cols,
    rows,
    MAX_MAZE_ITEMS,
    includeDecorations,
  )
  return { cols, rows, grid, playerStart, enemySpawns, itemSlots, decorations }
}

/** CITY es deliberadamente más grande — es una ciudad, no un laberinto de bolsillo. */
const CITY_COLS = 25
const CITY_ROWS = 17

/**
 * Cuatro laberintos fijos (no editables por quien crea el juego — son datos
 * del motor, la temática la aportan los íconos/colores/nombres del contenido
 * y de `config`). Verificados por conectividad: cada celda libre es
 * alcanzable desde cualquier otra.
 */
export const MAZE_LAYOUTS: Record<MazeLayout, MazeLayoutDef> = {
  CLASSIC: buildLayout(buildCombMaze(COLS, ROWS, 'vertical'), COLS, ROWS),
  SPIRAL: buildLayout(buildCombMaze(COLS, ROWS, 'horizontal'), COLS, ROWS),
  CROSS: buildLayout(buildCrossMaze(COLS, ROWS), COLS, ROWS),
  CITY: buildLayout(buildCityMaze(CITY_COLS, CITY_ROWS), CITY_COLS, CITY_ROWS, true),
}
