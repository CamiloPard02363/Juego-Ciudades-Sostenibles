/** Motor geométrico puro para una futura representación del tablero Dominexo. */

export const DOMINO_LAYOUT = {
  margin: 20,
  turnLane: 24,
  tileGap: 2,
  rowGap: 28,
  endZoneGap: 10,
  normal: { width: 136, height: 68 },
  normalVertical: { width: 68, height: 136 },
  double: { width: 124, height: 68 },
  doubleVertical: { width: 68, height: 124 },
} as const

export type DominoChainTile = {
  id: string
  isDouble: boolean
}

export type DominoViewport = {
  width: number
  height: number
}

export type Point = { x: number; y: number }
export type DominoVisualOrientation = 'horizontal' | 'vertical' | 'double-horizontal' | 'double-vertical'

export type DominoTilePlacement = {
  id: string
  index: number
  x: number
  y: number
  width: number
  height: number
  orientation: DominoVisualOrientation
  entry: Point
  exit: Point
}

export type DominoConnection = {
  fromIndex: number
  toIndex: number
  points: readonly Point[]
  kind: 'straight' | 'turn'
}

export type DominoChainLayout = {
  viable: true
  tiles: readonly DominoTilePlacement[]
  connections: readonly DominoConnection[]
  leftEnd: Point
  rightEnd: Point
  bounds: { x: number; y: number; width: number; height: number }
}

export type DominoChainLayoutFailure = {
  viable: false
  reason: 'invalid-viewport' | 'insufficient-width' | 'insufficient-height'
}

export type DominoChainLayoutResult = DominoChainLayout | DominoChainLayoutFailure

type Direction = 'right' | 'left'

const EPSILON = 0.001

function dimensions(tile: DominoChainTile) {
  return tile.isDouble ? DOMINO_LAYOUT.double : DOMINO_LAYOUT.normal
}

/** Dimensiones disponibles para una futura capa de fichas orientables. */
export function dimensionsForOrientation(orientation: DominoVisualOrientation) {
  switch (orientation) {
    case 'vertical': return DOMINO_LAYOUT.normalVertical
    case 'double-horizontal': return DOMINO_LAYOUT.double
    case 'double-vertical': return DOMINO_LAYOUT.doubleVertical
    default: return DOMINO_LAYOUT.normal
  }
}

function pointsEqual(a: Point, b: Point) {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON
}

/**
 * Distribuye la cadena en filas alternadas. Las fichas continúan siendo
 * horizontales; al terminar una fila, un conector en U cruza por el carril de
 * giro reservado. Esto hace explícita la continuidad sin superponer piezas.
 */
export function layoutDominoChain(
  board: readonly DominoChainTile[],
  viewport: DominoViewport,
): DominoChainLayoutResult {
  const { margin, turnLane, tileGap, rowGap } = DOMINO_LAYOUT
  const usableLeft = margin + turnLane
  const usableRight = viewport.width - margin - turnLane
  const rowHeight = DOMINO_LAYOUT.normal.height
  const rowStep = rowHeight + rowGap

  if (viewport.width <= 0 || viewport.height <= 0) return { viable: false, reason: 'invalid-viewport' }
  if (usableRight - usableLeft < DOMINO_LAYOUT.normal.width) return { viable: false, reason: 'insufficient-width' }
  if (viewport.height - margin * 2 < rowHeight) return { viable: false, reason: 'insufficient-height' }
  if (board.length === 0) {
    return {
      viable: true,
      tiles: [],
      connections: [],
      leftEnd: { x: viewport.width / 2, y: viewport.height / 2 },
      rightEnd: { x: viewport.width / 2, y: viewport.height / 2 },
      bounds: { x: viewport.width / 2, y: viewport.height / 2, width: 0, height: 0 },
    }
  }

  const placements: DominoTilePlacement[] = []
  const connections: DominoConnection[] = []
  let direction: Direction = 'right'
  let row = 0
  let cursor = usableLeft
  let y = margin

  for (let index = 0; index < board.length; index += 1) {
    const tile = board[index]
    const size = dimensions(tile)
    const fits = direction === 'right' ? cursor + size.width <= usableRight : cursor - size.width >= usableLeft

    if (!fits) {
      row += 1
      y = margin + row * rowStep
      if (y + rowHeight > viewport.height - margin) return { viable: false, reason: 'insufficient-height' }
      direction = direction === 'right' ? 'left' : 'right'
      cursor = direction === 'right' ? usableLeft : usableRight
    }

    const x = direction === 'right' ? cursor : cursor - size.width
    const entry = direction === 'right' ? { x, y: y + rowHeight / 2 } : { x: x + size.width, y: y + rowHeight / 2 }
    const exit = direction === 'right' ? { x: x + size.width, y: y + rowHeight / 2 } : { x, y: y + rowHeight / 2 }
    const placement: DominoTilePlacement = {
      id: tile.id,
      index,
      x,
      y,
      width: size.width,
      height: size.height,
      orientation: tile.isDouble ? 'double-horizontal' : 'horizontal',
      entry,
      exit,
    }

    const previous = placements[index - 1]
    if (previous) {
      const sameRow = previous.y === placement.y
      const laneX = previous.exit.x > viewport.width / 2 ? viewport.width - margin : margin
      const points = sameRow
        ? [previous.exit, placement.entry]
        : [previous.exit, { x: laneX, y: previous.exit.y }, { x: laneX, y: placement.entry.y }, placement.entry]
      connections.push({ fromIndex: previous.index, toIndex: index, points, kind: sameRow ? 'straight' : 'turn' })
    }

    placements.push(placement)
    cursor = direction === 'right' ? x + size.width + tileGap : x - tileGap
  }

  const minX = Math.min(...placements.map((tile) => tile.x))
  const minY = Math.min(...placements.map((tile) => tile.y))
  const maxX = Math.max(...placements.map((tile) => tile.x + tile.width))
  const maxY = Math.max(...placements.map((tile) => tile.y + tile.height))
  const first = placements[0]
  const last = placements[placements.length - 1]

  return {
    viable: true,
    tiles: placements,
    connections,
    leftEnd: { x: first.entry.x + (first.entry.x < first.exit.x ? -DOMINO_LAYOUT.endZoneGap : DOMINO_LAYOUT.endZoneGap), y: first.entry.y },
    rightEnd: { x: last.exit.x + (last.exit.x > last.entry.x ? DOMINO_LAYOUT.endZoneGap : -DOMINO_LAYOUT.endZoneGap), y: last.exit.y },
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  }
}

export function connectionIsContinuous(connection: DominoConnection, from: DominoTilePlacement, to: DominoTilePlacement) {
  return pointsEqual(connection.points[0], from.exit) && pointsEqual(connection.points[connection.points.length - 1], to.entry)
}
