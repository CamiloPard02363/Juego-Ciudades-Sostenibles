import type { CellPosition, MazeLayoutDef } from './mazeCollectorTypes'

/**
 * El mapa real de "Ciudad Sostenible" que ilustró el profesor (el SVG de
 * 800x600 con las manzanas urbanas, franjas verdes y puertas de
 * teletransporte) — reemplaza por completo el layout CITY generado
 * proceduralmente (bloques de colores) que había antes. La cuadrícula
 * caminable se deriva EXACTAMENTE de los mismos rectángulos de manzana que
 * dibuja el SVG (sección "4. MANZANAS URBANAS BASE"), así el laberinto
 * jugable coincide pixel a pixel con lo que se ve — la calle es la calle,
 * el edificio es el edificio.
 */

export const CITY_MAP_WIDTH = 800
export const CITY_MAP_HEIGHT = 600
/** Tamaño de celda en unidades del SVG — a este tamaño, el fondo se renderiza a escala 1:1 con la grilla, sin ningún cálculo de escalado. */
export const CITY_MAP_CELL_SIZE = 20

type Rect = { x: number; y: number; width: number; height: number }

/**
 * Cada rect es una manzana no transitable (edificio, parque o franja verde
 * decorativa) — copiados uno a uno de los `<rect>` bajo el grupo "4.
 * MANZANAS URBANAS BASE" del SVG. Todo lo que se dibuja DENTRO de una
 * manzana (edificios, canchas, el lago) ya cae dentro de estos rangos, así
 * que no hace falta listarlo aparte — se verificó a mano contra el SVG
 * completo.
 */
const WALL_RECTS: Rect[] = [
  // Fila Norte (franjas verdes decorativas)
  { x: 20, y: 10, width: 80, height: 25 },
  { x: 140, y: 10, width: 140, height: 25 },
  { x: 320, y: 10, width: 160, height: 25 },
  { x: 520, y: 10, width: 140, height: 25 },
  { x: 690, y: 10, width: 90, height: 25 },
  // Franja Norte-Centro
  { x: 20, y: 70, width: 80, height: 90 },
  { x: 140, y: 70, width: 140, height: 90 },
  { x: 320, y: 70, width: 160, height: 90 },
  { x: 520, y: 70, width: 140, height: 90 },
  { x: 690, y: 70, width: 90, height: 90 },
  // Franja Central
  { x: 20, y: 200, width: 160, height: 80 },
  { x: 220, y: 200, width: 140, height: 80 },
  { x: 400, y: 200, width: 180, height: 80 },
  { x: 620, y: 200, width: 160, height: 80 },
  // Franja Centro-Sur
  { x: 20, y: 320, width: 60, height: 80 },
  { x: 120, y: 320, width: 140, height: 80 },
  { x: 300, y: 320, width: 200, height: 80 },
  { x: 540, y: 320, width: 140, height: 80 },
  { x: 720, y: 320, width: 60, height: 80 },
  // Franja Inferior
  { x: 20, y: 440, width: 180, height: 90 },
  { x: 240, y: 440, width: 160, height: 90 },
  { x: 440, y: 440, width: 160, height: 90 },
  { x: 640, y: 440, width: 140, height: 90 },
  // Fila Sur (franjas verdes decorativas)
  { x: 20, y: 565, width: 180, height: 25 },
  { x: 240, y: 565, width: 160, height: 25 },
  { x: 440, y: 565, width: 160, height: 25 },
  { x: 640, y: 565, width: 140, height: 25 },
]

function isInsideAnyRect(x: number, y: number): boolean {
  return WALL_RECTS.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height)
}

export const CITY_MAP_COLS = CITY_MAP_WIDTH / CITY_MAP_CELL_SIZE
export const CITY_MAP_ROWS = CITY_MAP_HEIGHT / CITY_MAP_CELL_SIZE

/**
 * Rasteriza el mapa real a una cuadrícula: una celda es pared si su CENTRO
 * cae dentro de alguna manzana. El anillo exterior (fila/columna 0 y la
 * última de cada una) se fuerza a pared sin importar el rect: las franjas
 * verdes del SVG miden 25px pero el canvas tiene 600px de alto, así que
 * queda un resto de 10px de asfalto sin cubrir por ningún rect justo en el
 * borde — sin este forzado, ese resto se clasifica como calle abierta y
 * aparece como una "avenida" fantasma pegada al borde que no existe en el
 * dibujo. Mismo criterio que `addBorder()` en los demás layouts.
 */
function buildSostenibleCityGrid(): number[][] {
  const grid: number[][] = []
  for (let row = 0; row < CITY_MAP_ROWS; row++) {
    const cols: number[] = []
    for (let col = 0; col < CITY_MAP_COLS; col++) {
      const isBorder = row === 0 || row === CITY_MAP_ROWS - 1 || col === 0 || col === CITY_MAP_COLS - 1
      const centerX = col * CITY_MAP_CELL_SIZE + CITY_MAP_CELL_SIZE / 2
      const centerY = row * CITY_MAP_CELL_SIZE + CITY_MAP_CELL_SIZE / 2
      cols.push(isBorder || isInsideAnyRect(centerX, centerY) ? 1 : 0)
    }
    grid.push(cols)
  }
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

/**
 * Todas las filas abiertas de punta a punta por dentro (columnas 1..cols-2
 * — las columnas de borde están forzadas a pared por `buildSostenibleCityGrid`
 * y se abren acá mismo, no se leen) — las avenidas del mapa. A cada una se le
 * abre la pared del borde en ambos extremos, igual que `carveTunnels` en
 * mazeCollectorTypes.ts, para que sea una puerta de teletransporte real.
 */
function findAndCarveTunnelRows(grid: number[][]): number[] {
  const cols = grid[0].length
  const tunnelRows: number[] = []
  for (let row = 1; row < grid.length - 1; row++) {
    let fullyOpen = true
    for (let col = 1; col < cols - 1; col++) {
      if (grid[row][col] !== 0) {
        fullyOpen = false
        break
      }
    }
    if (fullyOpen) {
      grid[row][0] = 0
      grid[row][cols - 1] = 0
      tunnelRows.push(row)
    }
  }
  return tunnelRows
}

/**
 * Layout completo del mapa "Ciudad Sostenible" — mismas 4 esquinas para
 * las nubes, mismo criterio de spawn del jugador cerca del centro, pero
 * sobre la cuadrícula real del SVG en vez de una ciudad genérica.
 */
export function buildSostenibleCityLayout(): MazeLayoutDef {
  const grid = buildSostenibleCityGrid()
  const cols = CITY_MAP_COLS
  const rows = CITY_MAP_ROWS
  // Se talla ANTES de repartir spawns, igual que buildLayout() en
  // mazeCollectorTypes.ts — así ningún spawn termina eligiéndose sin saber
  // que un par de celdas de borde ya se abrieron para las avenidas.
  const tunnelRows = findAndCarveTunnelRows(grid)

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

  return {
    cols,
    rows,
    grid,
    playerStart,
    enemySpawns,
    itemSlots: [],
    tunnelRows,
  }
}
