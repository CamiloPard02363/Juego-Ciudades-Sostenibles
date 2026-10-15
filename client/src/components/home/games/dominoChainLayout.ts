/** Motor geométrico puro para una futura representación del tablero Dominexo. */

export const DOMINO_LAYOUT = {
  margin: 20,
  turnLane: 52,
  turnApproach: 40,
  // Una fila usa cerca de cuatro quintas partes de su tramo disponible antes de
  // doblar. El l\u00edmite depende solo del carril actual y del viewport, no de
  // fichas futuras.
  bidirectionalTurnRatio: 0.8,
  // Separación corta: conserva la lectura de cadena sin hacer que las fichas se monten.
  tileGap: 4,
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

function horizontalDimensions(tile: DominoChainTile) {
  return tile.isDouble ? DOMINO_LAYOUT.double : DOMINO_LAYOUT.normal
}

function verticalDimensions(tile: DominoChainTile) {
  return tile.isDouble ? DOMINO_LAYOUT.doubleVertical : DOMINO_LAYOUT.normalVertical
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
 * Distribuye la cadena en tramos alternados. Al terminar una fila, la siguiente
 * ficha se vuelve vertical y forma el giro físico hacia el siguiente tramo.
 * No necesita líneas externas ni superpone rectángulos de fichas.
 */
export function layoutDominoChain(
  board: readonly DominoChainTile[],
  viewport: DominoViewport,
): DominoChainLayoutResult {
  const { margin, turnLane, tileGap } = DOMINO_LAYOUT
  const usableLeft = margin + turnLane
  const usableRight = viewport.width - margin - turnLane
  const rowHeight = DOMINO_LAYOUT.normal.height

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
  let cursor = usableLeft
  let y: number = margin
  let pendingEntry: Point | null = null

  for (let index = 0; index < board.length; index += 1) {
    const tile = board[index]
    const size = horizontalDimensions(tile)
    if (y + size.height > viewport.height - margin) return { viable: false, reason: 'insufficient-height' }
    const fits = direction === 'right' ? cursor + size.width <= usableRight : cursor - size.width >= usableLeft
    const remainingAfterTile = direction === 'right' ? usableRight - (cursor + size.width) : (cursor - size.width) - usableLeft
    const turnsEarly = Boolean(placements.length) && index < board.length - 1 && fits && remainingAfterTile > 0 && remainingAfterTile < DOMINO_LAYOUT.turnApproach

    if (!fits || turnsEarly) {
      const previous = placements[index - 1]
      const turnSize = verticalDimensions(tile)
      if (!previous || previous.orientation === 'vertical' || previous.orientation === 'double-vertical') {
        return { viable: false, reason: 'insufficient-width' }
      }

      // La ficha de giro se centra sobre el extremo de salida. Esto hace que una
      // doble vertical se lea como articulación del recorrido, no como otra ficha
      // apilada al final de la fila.
      const turnCenterX = direction === 'right' ? previous.x + previous.width : previous.x
      const turnX = turnCenterX - turnSize.width / 2
      const turnY = previous.y + previous.height + tileGap
      if (turnY + turnSize.height > viewport.height - margin) return { viable: false, reason: 'insufficient-height' }

      const join = { x: turnCenterX, y: previous.y + previous.height + tileGap / 2 }
      previous.exit = join
      const turnPlacement: DominoTilePlacement = {
        id: tile.id,
        index,
        x: turnX,
        y: turnY,
        width: turnSize.width,
        height: turnSize.height,
        orientation: tile.isDouble ? 'double-vertical' : 'vertical',
        entry: join,
        exit: { x: turnCenterX, y: turnY + turnSize.height + tileGap / 2 },
      }
      connections.push({ fromIndex: previous.index, toIndex: index, points: [join], kind: 'turn' })
      placements.push(turnPlacement)
      direction = direction === 'right' ? 'left' : 'right'
      y = turnY + turnSize.height + tileGap
      cursor = turnCenterX
      pendingEntry = turnPlacement.exit
      continue
    }

    const x = direction === 'right' ? cursor : cursor - size.width
    const entry = pendingEntry ?? (direction === 'right' ? { x, y: y + rowHeight / 2 } : { x: x + size.width, y: y + rowHeight / 2 })
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
      const isTurn = previous.orientation === 'vertical' || previous.orientation === 'double-vertical'
      connections.push({ fromIndex: previous.index, toIndex: index, points: [previous.exit, placement.entry], kind: isTurn ? 'turn' : 'straight' })
    }

    placements.push(placement)
    cursor = direction === 'right' ? x + size.width + tileGap : x - tileGap
    pendingEntry = null
  }

  const minX = Math.min(...placements.map((tile) => tile.x))
  const minY = Math.min(...placements.map((tile) => tile.y))
  const maxX = Math.max(...placements.map((tile) => tile.x + tile.width))
  const maxY = Math.max(...placements.map((tile) => tile.y + tile.height))
  const offset = {
    x: (viewport.width - (maxX - minX)) / 2 - minX,
    y: (viewport.height - (maxY - minY)) / 2 - minY,
  }
  const translatePoint = (point: Point): Point => ({ x: point.x + offset.x, y: point.y + offset.y })
  const centeredTiles = placements.map((tile) => ({
    ...tile,
    x: tile.x + offset.x,
    y: tile.y + offset.y,
    entry: translatePoint(tile.entry),
    exit: translatePoint(tile.exit),
  }))
  const centeredConnections = connections.map((connection) => ({
    ...connection,
    points: connection.points.map(translatePoint),
  }))
  const first = centeredTiles[0]
  const last = centeredTiles[centeredTiles.length - 1]

  return {
    viable: true,
    tiles: centeredTiles,
    connections: centeredConnections,
    leftEnd: { x: first.entry.x + (first.entry.x < first.exit.x ? -DOMINO_LAYOUT.endZoneGap : DOMINO_LAYOUT.endZoneGap), y: first.entry.y },
    rightEnd: { x: last.exit.x + (last.exit.x > last.entry.x ? DOMINO_LAYOUT.endZoneGap : -DOMINO_LAYOUT.endZoneGap), y: last.exit.y },
    bounds: { x: minX + offset.x, y: minY + offset.y, width: maxX - minX, height: maxY - minY },
  }
}

export function connectionIsContinuous(connection: DominoConnection, from: DominoTilePlacement, to: DominoTilePlacement) {
  return pointsEqual(connection.points[0], from.exit) && pointsEqual(connection.points[connection.points.length - 1], to.entry)
}

export type DominoFlowDirection = 'left' | 'right' | 'up' | 'down'

export type BidirectionalDominoTilePlacement = DominoTilePlacement & {
  /** Orientación física de la ficha, independiente del avance lógico de la cadena. */
  visualOrientation: DominoVisualOrientation
  flowDirection: DominoFlowDirection
}

export type BidirectionalDominoChainLayout = {
  viable: true
  tiles: readonly BidirectionalDominoTilePlacement[]
  connections: readonly DominoConnection[]
  leftEnd: Point
  rightEnd: Point
  bounds: { x: number; y: number; width: number; height: number }
  openingTileId: string
}

export type BidirectionalDominoChainLayoutFailure = {
  viable: false
  reason: 'missing-opening-tile' | 'invalid-viewport' | 'insufficient-width' | 'insufficient-height' | 'collision'
}

export type BidirectionalDominoChainLayoutResult = BidirectionalDominoChainLayout | BidirectionalDominoChainLayoutFailure

type RoutePlacement = {
  placement: BidirectionalDominoTilePlacement
  inward: Point
  outward: Point
  rail?: 'top' | 'bottom'
}

type RouteSide = 'left' | 'right'

function visualDimensions(tile: DominoChainTile, flowDirection: DominoFlowDirection) {
  const horizontalFlow = flowDirection === 'left' || flowDirection === 'right'
  if (tile.isDouble) {
    return horizontalFlow
      ? { ...DOMINO_LAYOUT.doubleVertical, orientation: 'double-vertical' as const }
      : { ...DOMINO_LAYOUT.double, orientation: 'double-horizontal' as const }
  }
  return horizontalFlow
    ? { ...DOMINO_LAYOUT.normal, orientation: 'horizontal' as const }
    : { ...DOMINO_LAYOUT.normalVertical, orientation: 'vertical' as const }
}

function pointAtFlowEdge(x: number, y: number, width: number, height: number, direction: DominoFlowDirection, outward: boolean): Point {
  const sign = outward ? 1 : -1
  switch (direction) {
    case 'left': return { x: x + width / 2 - sign * width / 2, y: y + height / 2 }
    case 'right': return { x: x + width / 2 + sign * width / 2, y: y + height / 2 }
    case 'up': return { x: x + width / 2, y: y + height / 2 - sign * height / 2 }
    case 'down': return { x: x + width / 2, y: y + height / 2 + sign * height / 2 }
  }
}

function rectsOverlap(a: DominoTilePlacement, b: DominoTilePlacement) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function extendsPoint(point: Point, toward: Point, distance: number): Point {
  const dx = point.x - toward.x
  const dy = point.y - toward.y
  const length = Math.hypot(dx, dy) || 1
  return { x: point.x + (dx / length) * distance, y: point.y + (dy / length) * distance }
}

/**
 * Distribuye una cadena desde la ficha inaugural real. Los dos extremos se
 * calculan por separado: el izquierdo asciende al girar y el derecho desciende.
 * Así el ancla no se desplaza al añadir fichas a cualquiera de los extremos.
 */
export function layoutBidirectionalDominoChain(
  board: readonly DominoChainTile[],
  viewport: DominoViewport,
  openingTileId: string | null | undefined,
): BidirectionalDominoChainLayoutResult {
  if (viewport.width <= 0 || viewport.height <= 0) return { viable: false, reason: 'invalid-viewport' }
  if (!openingTileId) return { viable: false, reason: 'missing-opening-tile' }
  const openingIndex = board.findIndex((tile) => tile.id === openingTileId)
  if (openingIndex < 0) return { viable: false, reason: 'missing-opening-tile' }

  const { margin, turnLane, tileGap } = DOMINO_LAYOUT
  const usableLeft = margin + turnLane
  const usableRight = viewport.width - margin - turnLane
  if (usableRight - usableLeft < DOMINO_LAYOUT.normal.width) return { viable: false, reason: 'insufficient-width' }

  const anchorTile = board[openingIndex]
  const anchorVisual = visualDimensions(anchorTile, 'right')
  const anchor: BidirectionalDominoTilePlacement = {
    id: anchorTile.id,
    index: openingIndex,
    width: anchorVisual.width,
    height: anchorVisual.height,
    x: viewport.width / 2 - anchorVisual.width / 2,
    y: viewport.height / 2 - anchorVisual.height / 2,
    orientation: anchorVisual.orientation,
    visualOrientation: anchorVisual.orientation,
    flowDirection: 'right',
    entry: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
  }
  if (anchor.x < margin || anchor.x + anchor.width > viewport.width - margin || anchor.y < margin || anchor.y + anchor.height > viewport.height - margin) {
    return { viable: false, reason: 'insufficient-height' }
  }

  const anchorLeft = pointAtFlowEdge(anchor.x, anchor.y, anchor.width, anchor.height, 'left', true)
  const anchorRight = pointAtFlowEdge(anchor.x, anchor.y, anchor.width, anchor.height, 'right', true)
  anchor.entry = anchorLeft
  anchor.exit = anchorRight

  const allPlacements: BidirectionalDominoTilePlacement[] = [anchor]

  const buildRoute = (side: RouteSide): RoutePlacement[] | BidirectionalDominoChainLayoutFailure => {
    const indexes = side === 'left'
      ? Array.from({ length: openingIndex }, (_, offset) => openingIndex - offset - 1)
      : Array.from({ length: board.length - openingIndex - 1 }, (_, offset) => openingIndex + offset + 1)
    const route: RoutePlacement[] = []
    let flowDirection: DominoFlowDirection = side
    let cursor = side === 'left' ? anchor.x - tileGap : anchor.x + anchor.width + tileGap
    let horizontalRail: 'top' | 'bottom' = side === 'left' ? 'top' : 'bottom'
    let rowTop = side === 'left' ? anchor.y : anchor.y + anchor.height - DOMINO_LAYOUT.doubleVertical.height
    let rowBottom = side === 'left' ? anchor.y + DOMINO_LAYOUT.doubleVertical.height : anchor.y + anchor.height
    let rowStartCursor = cursor

    for (let routeIndex = 0; routeIndex < indexes.length; routeIndex += 1) {
      const index = indexes[routeIndex]
      const tile = board[index]
      let visual = visualDimensions(tile, flowDirection)
      const horizontalFlow = flowDirection === 'left' || flowDirection === 'right'
      let x = horizontalFlow && flowDirection === 'left' ? cursor - visual.width : cursor
      let y = horizontalRail === 'top' ? rowTop : rowBottom - visual.height
      const fits = horizontalFlow && x >= usableLeft && x + visual.width <= usableRight
      const turnDirection: DominoFlowDirection = side === 'left' ? 'up' : 'down'
      const turnVisual = visualDimensions(tile, turnDirection)
      const rowCapacity = flowDirection === 'left' ? rowStartCursor - usableLeft : usableRight - rowStartCursor
      const rowUsageAfterTile = Math.abs(cursor - rowStartCursor) + visual.width + tileGap
      const reachesCompositionThreshold = rowUsageAfterTile > rowCapacity * DOMINO_LAYOUT.bidirectionalTurnRatio
      const previous = route.at(-1)?.placement ?? anchor
      const turnBoundary = flowDirection === 'left' ? previous.x : previous.x + previous.width
      const turnX = turnBoundary - turnVisual.width / 2
      const turnY = turnDirection === 'up' ? previous.y - tileGap - turnVisual.height : previous.y + previous.height + tileGap
      const nextFlowDirection: DominoFlowDirection = flowDirection === 'left' ? 'right' : 'left'
      const nextLaneHeight = Math.max(DOMINO_LAYOUT.normal.height, DOMINO_LAYOUT.doubleVertical.height)
      const nextHorizontalRail: 'top' | 'bottom' = turnDirection === 'up' ? 'bottom' : 'top'
      const nextRowBottom = turnDirection === 'up' ? turnY - tileGap : turnY + turnVisual.height + tileGap + nextLaneHeight
      const nextRowTop = turnDirection === 'up' ? nextRowBottom - nextLaneHeight : turnY + turnVisual.height + tileGap
      const nextCursor = turnX + turnVisual.width / 2
      const turnPrototype: DominoTilePlacement = {
        id: tile.id, index, x: turnX, y: turnY, width: turnVisual.width, height: turnVisual.height,
        orientation: turnVisual.orientation, entry: { x: 0, y: 0 }, exit: { x: 0, y: 0 },
      }
      const isInsideBoard = (placement: DominoTilePlacement) => (
        placement.x >= margin
        && placement.x + placement.width <= viewport.width - margin
        && placement.y >= margin
        && placement.y + placement.height <= viewport.height - margin
      )
      const continuationPrototypes = [false, true].map((isDouble) => {
        const continuationVisual = visualDimensions({ id: 'reserved-continuation', isDouble }, nextFlowDirection)
        const continuationX = nextFlowDirection === 'right' ? nextCursor : nextCursor - continuationVisual.width
        return {
          id: 'reserved-continuation', index: -1, x: continuationX,
          y: nextHorizontalRail === 'top' ? nextRowTop : nextRowBottom - continuationVisual.height,
          width: continuationVisual.width, height: continuationVisual.height,
          orientation: continuationVisual.orientation, entry: { x: 0, y: 0 }, exit: { x: 0, y: 0 },
        } satisfies DominoTilePlacement
      })
      const turnFits = isInsideBoard(turnPrototype) && !allPlacements.some((other) => rectsOverlap(turnPrototype, other))
      const canCompleteTurn = turnFits && continuationPrototypes.every((continuation) => (
        isInsideBoard(continuation)
        && !rectsOverlap(continuation, turnPrototype)
        && !allPlacements.some((other) => rectsOverlap(continuation, other))
      ))
      // La decisi\u00f3n depende solo del carril actual. As\u00ed, extender una ruta
      // no cambia las coordenadas ni los giros de su prefijo ya colocado.
      const shouldTurnEarly = fits
        && horizontalFlow
        && canCompleteTurn
        && rowUsageAfterTile > DOMINO_LAYOUT.normal.width + DOMINO_LAYOUT.tileGap
        && reachesCompositionThreshold

      if (!fits || shouldTurnEarly) {
        if (!canCompleteTurn) {
          const continuationExceedsHeight = continuationPrototypes.some((continuation) => (
            continuation.y < margin || continuation.y + continuation.height > viewport.height - margin
          ))
          return { viable: false, reason: continuationExceedsHeight ? 'insufficient-height' : 'collision' }
        }
        visual = turnVisual
        const boundary = flowDirection === 'left' ? previous.x : previous.x + previous.width
        x = boundary - visual.width / 2
        y = turnDirection === 'up' ? previous.y - tileGap - visual.height : previous.y + previous.height + tileGap
        if (x < margin || x + visual.width > viewport.width - margin || y < margin || y + visual.height > viewport.height - margin) {
          // El giro anticipado es opcional: si no hay altura o el carril se
          // cruza, se conserva el tramo actual mientras la ficha siga cabiendo.
          if (shouldTurnEarly) {
            visual = visualDimensions(tile, flowDirection)
            x = flowDirection === 'left' ? cursor - visual.width : cursor
            y = horizontalRail === 'top' ? rowTop : rowBottom - visual.height
          } else {
            return { viable: false, reason: 'insufficient-height' }
          }
        }
        if (shouldTurnEarly && allPlacements.some((other) => rectsOverlap({
          id: tile.id, index, x, y, width: visual.width, height: visual.height,
          orientation: visual.orientation, entry: { x: 0, y: 0 }, exit: { x: 0, y: 0 },
        }, other))) {
          visual = visualDimensions(tile, flowDirection)
          x = flowDirection === 'left' ? cursor - visual.width : cursor
          y = horizontalRail === 'top' ? rowTop : rowBottom - visual.height
        } else if (shouldTurnEarly || !fits) {
          const inward = pointAtFlowEdge(x, y, visual.width, visual.height, turnDirection, false)
          const outward = pointAtFlowEdge(x, y, visual.width, visual.height, turnDirection, true)
          const placement: BidirectionalDominoTilePlacement = {
            id: tile.id, index, x, y, width: visual.width, height: visual.height,
            orientation: visual.orientation, visualOrientation: visual.orientation, flowDirection: turnDirection,
            entry: inward, exit: outward,
          }
          if (allPlacements.some((other) => rectsOverlap(placement, other))) return { viable: false, reason: 'collision' }
          allPlacements.push(placement)
          route.push({ placement, inward, outward })
          flowDirection = flowDirection === 'left' ? 'right' : 'left'
          horizontalRail = nextHorizontalRail
          rowTop = nextRowTop
          rowBottom = nextRowBottom
          cursor = x + visual.width / 2
          rowStartCursor = cursor
          continue
        }
      }

      const inward = pointAtFlowEdge(x, y, visual.width, visual.height, flowDirection, false)
      const outward = pointAtFlowEdge(x, y, visual.width, visual.height, flowDirection, true)
      const placement: BidirectionalDominoTilePlacement = {
        id: tile.id, index, x, y, width: visual.width, height: visual.height,
        orientation: visual.orientation, visualOrientation: visual.orientation, flowDirection,
        entry: inward, exit: outward,
      }
      if (y < margin || y + visual.height > viewport.height - margin || allPlacements.some((other) => rectsOverlap(placement, other))) {
        return { viable: false, reason: 'collision' }
      }
      allPlacements.push(placement)
      route.push({ placement, inward, outward, rail: horizontalRail })
      cursor = flowDirection === 'left' ? x - tileGap : x + visual.width + tileGap
    }
    return route
  }

  const leftRoute = buildRoute('left')
  if (!Array.isArray(leftRoute)) return leftRoute
  const rightRoute = buildRoute('right')
  if (!Array.isArray(rightRoute)) return rightRoute

  const tiles = Array<BidirectionalDominoTilePlacement>(board.length)
  tiles[openingIndex] = anchor
  const horizontalRails = new Map<number, 'top' | 'bottom'>()
  for (const item of leftRoute) {
    // En el lado izquierdo, el extremo lógico hacia el ancla es la salida.
    item.placement.entry = item.outward
    item.placement.exit = item.inward
    tiles[item.placement.index] = item.placement
    if (item.rail) horizontalRails.set(item.placement.index, item.rail)
  }
  for (const item of rightRoute) {
    item.placement.entry = item.inward
    item.placement.exit = item.outward
    tiles[item.placement.index] = item.placement
    if (item.rail) horizontalRails.set(item.placement.index, item.rail)
  }

  const isHorizontal = (tile: BidirectionalDominoTilePlacement) => tile.flowDirection === 'left' || tile.flowDirection === 'right'
  const center = (tile: BidirectionalDominoTilePlacement) => ({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 })
  const railFor = (fromIndex: number, toIndex: number): 'top' | 'bottom' => {
    if (fromIndex < openingIndex) return horizontalRails.get(fromIndex) ?? 'top'
    if (toIndex > openingIndex) return horizontalRails.get(toIndex) ?? 'bottom'
    return fromIndex === openingIndex ? 'bottom' : 'top'
  }
  const connections = tiles.slice(0, -1).map((tile, index) => {
    const next = tiles[index + 1]
    const fromHorizontal = isHorizontal(tile)
    const toHorizontal = isHorizontal(next)
    const fromCenter = center(tile)
    const toCenter = center(next)

    if (fromHorizontal && toHorizontal) {
      const rail = railFor(index, index + 1)
      const y = rail === 'top' ? Math.max(tile.y, next.y) : Math.min(tile.y + tile.height, next.y + next.height)
      const toRight = toCenter.x >= fromCenter.x
      tile.exit = { x: toRight ? tile.x + tile.width : tile.x, y }
      next.entry = { x: toRight ? next.x : next.x + next.width, y }
    } else if (fromHorizontal) {
      const toBelow = toCenter.y >= fromCenter.y
      const toRight = toCenter.x >= fromCenter.x
      tile.exit = { x: toRight ? tile.x + tile.width : tile.x, y: toBelow ? tile.y + tile.height : tile.y }
      next.entry = { x: toCenter.x, y: toBelow ? next.y : next.y + next.height }
    } else if (toHorizontal) {
      const toBelow = toCenter.y >= fromCenter.y
      const toRight = toCenter.x >= fromCenter.x
      tile.exit = { x: fromCenter.x, y: toBelow ? tile.y + tile.height : tile.y }
      next.entry = { x: toRight ? next.x : next.x + next.width, y: toBelow ? next.y : next.y + next.height }
    }

    return {
      fromIndex: index,
      toIndex: index + 1,
      points: [tile.exit, next.entry],
      kind: !fromHorizontal || !toHorizontal ? 'turn' as const : 'straight' as const,
    }
  })
  const minX = Math.min(...tiles.map((tile) => tile.x))
  const minY = Math.min(...tiles.map((tile) => tile.y))
  const maxX = Math.max(...tiles.map((tile) => tile.x + tile.width))
  const maxY = Math.max(...tiles.map((tile) => tile.y + tile.height))

  return {
    viable: true,
    tiles,
    connections,
    leftEnd: extendsPoint(tiles[0].entry, tiles[0].exit, DOMINO_LAYOUT.endZoneGap),
    rightEnd: extendsPoint(tiles[tiles.length - 1].exit, tiles[tiles.length - 1].entry, DOMINO_LAYOUT.endZoneGap),
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    openingTileId,
  }
}
