import { DOMINO_ICON_LABELS, iconForConcept } from './dominoTypes'

export { DOMINO_ICON_LABELS as MAZE_ICON_LABELS, iconForConcept }

export type MazeCollectorDifficulty = 'LOW' | 'MEDIUM' | 'HIGH'

/** Tipos de residuo con puntaje propio — ver WASTE_POINTS en mazeCollectorEngine.ts. */
export type WasteType = 'PLASTIC' | 'PAPER' | 'GLASS'

/** Zonas temáticas del layout CITY. School y RecyclingCenter son celdas-trigger de preguntas de zona. */
export type ZoneType = 'residential' | 'commercial' | 'park' | 'school' | 'recycling_center'

/** Pregunta de opción múltiple mostrada al recolectar el ítem, antes de sumar el punto. */
export type MazeCollectorQuestion = {
  prompt: string
  options: string[]
  correctOptionIndex: number
  difficulty?: MazeCollectorDifficulty
}

/** Un objeto coleccionable del laberinto: reemplaza la "pastilla" genérica por un concepto temático. */
export type MazeCollectorItem = {
  itemId: string
  label: string
  /** Clave del catálogo DOMINO_ICONS (reutilizado tal cual, ver dominoTypes.ts). */
  icon: string
  color: string
  fact?: string
  /** Opcional: si viene, recolectar el ítem pausa el juego con esta pregunta antes de sumar el punto. */
  question?: MazeCollectorQuestion
  /** Opcional: cambia el puntaje del ítem según WASTE_POINTS. Sin esto, vale POINTS_PER_ITEM (retrocompatible). */
  wasteType?: WasteType
  /** Marca este ítem como el PowerUpRecycling: al recogerlo activa "Super-Recogida" (las nubes huyen). */
  isPowerUp?: boolean
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
  /** Solo aplica con layout CITY: pregunta disparada al entrar a la zona 'school'. */
  schoolQuestion?: MazeCollectorQuestion
  /** Solo aplica con layout CITY: pregunta disparada al entrar a la zona 'recycling_center'. */
  recyclingQuestion?: MazeCollectorQuestion
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
  /** Solo en CITY: zona temática de cada celda, misma indexación que `grid`. Ausente en layouts abstractos. */
  zones?: (ZoneType | null)[][]
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
 * Rejilla de calles cada `spacing` filas/columnas dentro de un cuadrante
 * rectangular — el mismo patrón que antes usaba buildCityMaze para todo el
 * mapa, ahora aplicado por zona con distinta densidad de calles según el
 * carácter del barrio (comercial más denso, residencial más espaciado).
 */
function carveStreetGrid(
  grid: number[][],
  zones: (ZoneType | null)[][],
  zone: ZoneType,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
  spacing: number,
): void {
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      zones[r][c] = zone
      const isStreet = (r - rowStart) % spacing === 0 || (c - colStart) % spacing === 0
      if (isStreet) grid[r][c] = 0
    }
  }
}

/**
 * Mapa CITY diseñado a mano por cuadrantes temáticos (no procedural): imita
 * la composición del boceto de referencia — parque con centro de reciclaje
 * arriba-izquierda, distrito comercial arriba-derecha, residencial
 * abajo-izquierda, escuela+residencial abajo-derecha — cruzados por una
 * avenida principal horizontal y vertical que garantiza conectividad entre
 * las cuatro zonas sin depender de un solver.
 */
function buildCityMaze(cols: number, rows: number): { grid: number[][]; zones: (ZoneType | null)[][] } {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(1))
  const zones: (ZoneType | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null))

  const midRow = Math.floor(rows / 2)
  const midCol = Math.floor(cols / 2)
  // Avenida principal: una sola fila/columna, horizontal y vertical, cruzadas
  // en el centro — mismo principio de "spine siempre abierta" que
  // buildCombMaze/buildCrossMaze usan para garantizar conectividad total, sin
  // restarle protagonismo de área a las zonas temáticas (una avenida ancha
  // diluía el cupo de ítems por zona).
  const avenueRowStart = midRow
  const avenueRowEnd = midRow
  const avenueColStart = midCol
  const avenueColEnd = midCol

  // Cuadrante arriba-izquierda: parque con centro de reciclaje en la esquina
  // más cercana a la avenida (fácil de alcanzar desde cualquier otra zona).
  carveStreetGrid(grid, zones, 'park', 1, avenueRowStart - 1, 1, avenueColStart - 1, 3)
  const recyclingRowStart = Math.max(1, avenueRowStart - 4)
  const recyclingColStart = Math.max(1, avenueColStart - 4)
  carveStreetGrid(grid, zones, 'recycling_center', recyclingRowStart, avenueRowStart - 1, recyclingColStart, avenueColStart - 1, 2)

  // Arriba-derecha: distrito comercial, calles más densas (spacing menor).
  carveStreetGrid(grid, zones, 'commercial', 1, avenueRowStart - 1, avenueColEnd + 1, cols - 2, 3)

  // Abajo-izquierda: residencial, rejilla clásica más espaciada.
  carveStreetGrid(grid, zones, 'residential', avenueRowEnd + 1, rows - 2, 1, avenueColStart - 1, 4)

  // Abajo-derecha: escuela en el bloque más cercano a la avenida, resto residencial.
  carveStreetGrid(grid, zones, 'residential', avenueRowEnd + 1, rows - 2, avenueColEnd + 1, cols - 2, 4)
  const schoolRowEnd = Math.min(rows - 2, avenueRowEnd + 4)
  const schoolColEnd = Math.min(cols - 2, avenueColEnd + 4)
  carveStreetGrid(grid, zones, 'school', avenueRowEnd + 1, schoolRowEnd, avenueColEnd + 1, schoolColEnd, 2)

  // Avenida principal: siempre calle, sin zona asociada (es vía de paso, no manzana).
  for (let r = avenueRowStart; r <= avenueRowEnd; r++) {
    for (let c = 1; c < cols - 1; c++) grid[r][c] = 0
  }
  for (let c = avenueColStart; c <= avenueColEnd; c++) {
    for (let r = 1; r < rows - 1; r++) grid[r][c] = 0
  }

  addBorder(grid)
  return { grid, zones }
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

const ZONES_WITH_ENEMY: readonly ZoneType[] = ['park', 'commercial', 'residential', 'school']

/**
 * Reparte los itemSlots proporcionalmente entre zonas (en vez de un stride
 * global que podía concentrar todos los ítems en una sola zona por el orden
 * de recorrido del grid) — cada zona contribuye una porción de `maxItems`
 * acorde a su tamaño relativo.
 */
function deriveZonedItemSlots(
  candidates: CellPosition[],
  zones: (ZoneType | null)[][],
  maxItems: number,
): CellPosition[] {
  // Las celdas sin zona (avenida principal, mera vía de paso) no reciben
  // ítems — repartir entre ellas diluiría el cupo de las zonas temáticas
  // reales, que es lo que hace que el mapa se sienta compuesto por barrios.
  const byZone = new Map<ZoneType, CellPosition[]>()
  for (const cell of candidates) {
    const zone = zones[cell.row][cell.col]
    if (!zone) continue
    const bucket = byZone.get(zone) ?? []
    bucket.push(cell)
    byZone.set(zone, bucket)
  }

  // Cupo por zona calculado de antemano (mínimo 1 por zona con celdas
  // disponibles) para que ninguna zona se quede sin ítems por agotarse el
  // total antes de llegar a ella — el orden de iteración del Map ya no importa.
  const zoneEntries = [...byZone.entries()]
  const totalZoned = zoneEntries.reduce((sum, [, bucket]) => sum + bucket.length, 0)
  const quotas = zoneEntries.map(([, bucket]) =>
    bucket.length === 0 ? 0 : Math.max(1, Math.round((bucket.length / totalZoned) * maxItems)),
  )
  // Si la suma de mínimos-por-zona excede maxItems, recorta proporcionalmente
  // empezando por la zona con mayor cupo (nunca deja una zona en 0 salvo que ya lo fuera).
  while (quotas.reduce((sum, q) => sum + q, 0) > maxItems) {
    const maxIndex = quotas.indexOf(Math.max(...quotas))
    quotas[maxIndex] -= 1
  }

  const slots: CellPosition[] = []
  zoneEntries.forEach(([, bucket], index) => {
    const quota = quotas[index]
    if (quota <= 0) return
    const stride = Math.max(1, Math.floor(bucket.length / quota))
    let takenFromZone = 0
    for (let i = 0; i < bucket.length && takenFromZone < quota && slots.length < maxItems; i += stride) {
      slots.push(bucket[i])
      takenFromZone++
    }
  })
  return slots.slice(0, maxItems)
}

/** Reparte, de forma fija y determinista, dónde nace el jugador, dónde nacen los enemigos y qué celdas pueden llevar un objeto. */
function deriveSlots(
  grid: number[][],
  cols: number,
  rows: number,
  maxItems: number,
  includeDecorations: boolean,
  zones?: (ZoneType | null)[][],
) {
  const used: CellPosition[] = []

  const playerStart = closestOpenCell(grid, Math.floor(rows / 2), Math.floor(cols / 2), used)
  used.push(playerStart)

  let enemySpawns: CellPosition[]
  if (zones) {
    // Un enemigo patrullando cada zona temática, en vez de las 4 esquinas
    // geométricas — más coherente con el mapa por zonas que con un grid abstracto.
    enemySpawns = ZONES_WITH_ENEMY.map((zone) => {
      const zoneCells = openCells(grid).filter((cell) => zones[cell.row][cell.col] === zone)
      const centerRow = zoneCells.reduce((sum, c) => sum + c.row, 0) / Math.max(1, zoneCells.length)
      const centerCol = zoneCells.reduce((sum, c) => sum + c.col, 0) / Math.max(1, zoneCells.length)
      const spawn = closestOpenCell(grid, Math.round(centerRow), Math.round(centerCol), used)
      used.push(spawn)
      return spawn
    })
  } else {
    const corners: Array<[number, number]> = [
      [1, 1],
      [1, cols - 2],
      [rows - 2, 1],
      [rows - 2, cols - 2],
    ]
    enemySpawns = corners.map(([r, c]) => {
      const spawn = closestOpenCell(grid, r, c, used)
      used.push(spawn)
      return spawn
    })
  }

  const remaining = openCells(grid).filter((cell) => !used.some((u) => u.row === cell.row && u.col === cell.col))
  const itemSlots = zones
    ? deriveZonedItemSlots(remaining, zones, maxItems)
    : (() => {
        const stride = Math.max(1, Math.floor(remaining.length / maxItems))
        const slots: CellPosition[] = []
        for (let i = 0; i < remaining.length && slots.length < maxItems; i += stride) {
          slots.push(remaining[i])
        }
        return slots
      })()
  for (const slot of itemSlots) used.push(slot)

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

function buildLayout(
  grid: number[][],
  cols: number,
  rows: number,
  includeDecorations = false,
  zones?: (ZoneType | null)[][],
): MazeLayoutDef {
  const { playerStart, enemySpawns, itemSlots, decorations } = deriveSlots(
    grid,
    cols,
    rows,
    MAX_MAZE_ITEMS,
    includeDecorations,
    zones,
  )
  return { cols, rows, grid, playerStart, enemySpawns, itemSlots, decorations, ...(zones ? { zones } : {}) }
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
const city = buildCityMaze(CITY_COLS, CITY_ROWS)

export const MAZE_LAYOUTS: Record<MazeLayout, MazeLayoutDef> = {
  CLASSIC: buildLayout(buildCombMaze(COLS, ROWS, 'vertical'), COLS, ROWS),
  SPIRAL: buildLayout(buildCombMaze(COLS, ROWS, 'horizontal'), COLS, ROWS),
  CROSS: buildLayout(buildCrossMaze(COLS, ROWS), COLS, ROWS),
  CITY: buildLayout(city.grid, CITY_COLS, CITY_ROWS, true, city.zones),
}
