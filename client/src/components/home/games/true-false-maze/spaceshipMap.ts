import type { CellPosition } from '../mazeCollectorTypes'

/**
 * Mapa de la nave espacial (escenario NAVE_ESPACIAL). Es dato del motor,
 * no del contenido: quien crea un juego solo escribe afirmaciones, el mapa
 * es siempre este. Se dibuja en ASCII para poder leerlo y retocarlo a ojo:
 *
 *   ' ' espacio exterior        '#' muro
 *   '.' piso con punto de energía   ',' piso sin punto
 *   'o' núcleo de energía (pulso EMP)   'P' salida del robot
 *   'N' nido de medusas (reactor)      'A' lugar posible de una sala VERDADERO/FALSO
 *   '1'-'9' rejilla de ventilación: las dos con el mismo número se conectan
 *   'c' caja / 'b' barriles (obstáculos)   'g' rejilla de piso / 'x' cables (decoración)
 *
 * Verificado por spaceshipMap.spec.ts: toda celda libre es alcanzable y no
 * hay callejones sin salida (en un laberinto con perseguidores, un callejón
 * es una trampa sin escapatoria).
 */
export const SPACESHIP_ASCII: readonly string[] = [
  '######################## ',
  '#1.g.###........3###..2# ',
  '#..A......c.A.c......A.# ',
  '#o...#.#.........#.#..o# ',
  '##.###.###########.###.# ',
  ' #.###.#,,,,,,,,,#.###.##',
  ' #,N,#.#,,c,,,b,,#.#....#',
  ' #NN,...,,,,P,,,,......A#',
  ' #,N,#.#,,b,,,c,,#.#....#',
  ' #.###.#,,,,,,,,,#.###.##',
  '##.###.#####.#####.###.# ',
  '#o...#.#.........#.#..o# ',
  '#..A......b.A.b......A.# ',
  '#1.g.###3...x....###..2# ',
  '######################## ',
]

export type FloorTileKey =
  | 'floor-008'
  | 'floor-009'
  | 'floor-010'
  | 'floor-011'
  | 'floor-012'
  | 'floor-013'
  | 'floor-014'
  | 'floor-015'

export type ShipRoom = {
  id: string
  label: string
  top: number
  left: number
  bottom: number
  right: number
  floor: FloorTileKey
}

/** Salas de la nave: definen el piso que se dibuja y el letrero de cada una. */
const ROOMS: ShipRoom[] = [
  { id: 'engine-top', label: 'Motor superior', top: 1, left: 1, bottom: 3, right: 4, floor: 'floor-010' },
  { id: 'engine-bottom', label: 'Motor inferior', top: 11, left: 1, bottom: 13, right: 4, floor: 'floor-010' },
  { id: 'reactor', label: 'Reactor', top: 6, left: 2, bottom: 8, right: 4, floor: 'floor-014' },
  { id: 'lab', label: 'Laboratorio', top: 1, left: 8, bottom: 3, right: 16, floor: 'floor-008' },
  { id: 'electrical', label: 'Electricidad', top: 11, left: 8, bottom: 13, right: 16, floor: 'floor-009' },
  { id: 'questions', label: 'Sala de preguntas', top: 5, left: 8, bottom: 9, right: 16, floor: 'floor-015' },
  { id: 'comms', label: 'Comunicaciones', top: 1, left: 20, bottom: 3, right: 22, floor: 'floor-011' },
  { id: 'shields', label: 'Escudos', top: 11, left: 20, bottom: 13, right: 22, floor: 'floor-011' },
  { id: 'navigation', label: 'Navegación', top: 6, left: 20, bottom: 8, right: 23, floor: 'floor-015' },
]

export type ShipTile = 'void' | 'wall' | 'floor' | 'obstacle'

export type ShipObstacle = { pos: CellPosition; kind: 'crate' | 'barrels' }

export type ShipVent = { pos: CellPosition; target: CellPosition }

export type ShipDecor = {
  /** Fila de terminales con "?" sobre el muro norte de la sala de preguntas. */
  terminals: { row: number; centerCol: number; widthCells: number }
  /** Cámaras de seguridad colgadas de caras de muro. */
  cameras: CellPosition[]
  /** Puerta decorativa del reactor (nido de las medusas). */
  doors: CellPosition[]
  cables: CellPosition[]
  grates: CellPosition[]
}

export type ShipMap = {
  cols: number
  rows: number
  /** 0 = transitable, 1 = bloqueado — mismo formato que usan las funciones de mazeEngine.ts. */
  grid: number[][]
  tiles: ShipTile[][]
  playerStart: CellPosition
  /** Celdas del nido, en orden de salida (la más cercana a la puerta primero). */
  nest: CellPosition[]
  answerSlots: CellPosition[]
  vents: ShipVent[]
  powerCores: CellPosition[]
  dots: CellPosition[]
  obstacles: ShipObstacle[]
  /** Puntos que patrulla cada medusa "patrullera" (uno por medusa, en orden). */
  patrolPoints: CellPosition[]
  rooms: ShipRoom[]
  decor: ShipDecor
}

const WALKABLE = new Set(['.', ',', 'o', 'P', 'N', 'A', 'g', 'x', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
const WITH_DOT = new Set(['.', 'g', 'x'])

export function parseShipMap(
  ascii: readonly string[],
  extras: { rooms: ShipRoom[]; patrolPoints: CellPosition[]; decor: Omit<ShipDecor, 'cables' | 'grates'> },
): ShipMap {
  const rows = ascii.length
  const cols = ascii[0].length
  const grid: number[][] = []
  const tiles: ShipTile[][] = []
  const nest: CellPosition[] = []
  const answerSlots: CellPosition[] = []
  const powerCores: CellPosition[] = []
  const dots: CellPosition[] = []
  const obstacles: ShipObstacle[] = []
  const cables: CellPosition[] = []
  const grates: CellPosition[] = []
  const ventsByDigit = new Map<string, CellPosition[]>()
  let playerStart: CellPosition | null = null

  ascii.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`Fila ${row} del mapa mide ${line.length}, se esperaban ${cols}.`)
    grid.push([])
    tiles.push([])
    for (let col = 0; col < cols; col++) {
      const char = line[col]
      const pos = { row, col }
      const walkable = WALKABLE.has(char)
      grid[row].push(walkable ? 0 : 1)
      tiles[row].push(walkable ? 'floor' : char === '#' ? 'wall' : char === 'c' || char === 'b' ? 'obstacle' : 'void')

      if (WITH_DOT.has(char)) dots.push(pos)
      if (char === 'P') playerStart = pos
      if (char === 'N') nest.push(pos)
      if (char === 'A') answerSlots.push(pos)
      if (char === 'o') powerCores.push(pos)
      if (char === 'c') obstacles.push({ pos, kind: 'crate' })
      if (char === 'b') obstacles.push({ pos, kind: 'barrels' })
      if (char === 'x') cables.push(pos)
      if (char === 'g') grates.push(pos)
      if (char >= '1' && char <= '9') ventsByDigit.set(char, [...(ventsByDigit.get(char) ?? []), pos])
    }
  })

  if (!playerStart) throw new Error('El mapa necesita una salida del robot (P).')
  const start: CellPosition = playerStart

  const vents: ShipVent[] = []
  for (const [digit, cells] of ventsByDigit) {
    if (cells.length !== 2) throw new Error(`La rejilla ${digit} debe aparecer exactamente 2 veces.`)
    vents.push({ pos: cells[0], target: cells[1] }, { pos: cells[1], target: cells[0] })
  }

  // El reactor abre hacia el este: sale primero la medusa más al este y,
  // entre las de la misma columna, la de la fila central del nido.
  const centerRow = nest.reduce((sum, cell) => sum + cell.row, 0) / Math.max(1, nest.length)
  nest.sort(
    (a, b) => b.col - a.col || Math.abs(a.row - centerRow) - Math.abs(b.row - centerRow) || a.row - b.row,
  )

  return {
    cols,
    rows,
    grid,
    tiles,
    playerStart: start,
    nest,
    answerSlots,
    vents,
    powerCores,
    dots,
    obstacles,
    patrolPoints: extras.patrolPoints,
    rooms: extras.rooms,
    decor: { ...extras.decor, cables, grates },
  }
}

export const SPACESHIP_MAP: ShipMap = parseShipMap(SPACESHIP_ASCII, {
  rooms: ROOMS,
  patrolPoints: [
    { row: 2, col: 12 },
    { row: 12, col: 12 },
    { row: 7, col: 21 },
    { row: 7, col: 6 },
  ],
  decor: {
    terminals: { row: 4, centerCol: 12, widthCells: 6 },
    cameras: [
      { row: 0, col: 11 },
      { row: 5, col: 21 },
      { row: 10, col: 3 },
    ],
    doors: [{ row: 5, col: 4 }],
  },
})

export function roomAt(map: ShipMap, cell: CellPosition): ShipRoom | null {
  return (
    map.rooms.find(
      (room) => cell.row >= room.top && cell.row <= room.bottom && cell.col >= room.left && cell.col <= room.right,
    ) ?? null
  )
}

export function cellKey(cell: CellPosition): string {
  return `${cell.row}:${cell.col}`
}
