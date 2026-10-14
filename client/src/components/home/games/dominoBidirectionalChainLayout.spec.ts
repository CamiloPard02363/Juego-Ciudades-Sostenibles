import { describe, expect, it } from 'vitest'
import {
  connectionIsContinuous,
  DOMINO_LAYOUT,
  layoutBidirectionalDominoChain,
  type DominoChainTile,
} from './dominoChainLayout'

const viewport = { width: 1440, height: 900 }
const chain = (count: number, openingIndex: number, doubles = new Set<number>()): DominoChainTile[] =>
  Array.from({ length: count }, (_, index) => ({ id: index === openingIndex ? 'opening' : `tile-${index}`, isDouble: doubles.has(index) }))

function expectLayout(board: DominoChainTile[], openingTileId = 'opening', size = viewport) {
  const original = structuredClone(board)
  const result = layoutBidirectionalDominoChain(board, size, openingTileId)
  expect(result.viable, result.viable ? undefined : result.reason).toBe(true)
  if (!result.viable) return
  expect(board).toEqual(original)
  expect(result.tiles.map((tile) => tile.id)).toEqual(board.map((tile) => tile.id))
  result.tiles.forEach((tile) => {
    expect(tile.x).toBeGreaterThanOrEqual(DOMINO_LAYOUT.margin)
    expect(tile.y).toBeGreaterThanOrEqual(DOMINO_LAYOUT.margin)
    expect(tile.x + tile.width).toBeLessThanOrEqual(size.width - DOMINO_LAYOUT.margin)
    expect(tile.y + tile.height).toBeLessThanOrEqual(size.height - DOMINO_LAYOUT.margin)
  })
  result.connections.forEach((connection) => {
    expect(connectionIsContinuous(connection, result.tiles[connection.fromIndex], result.tiles[connection.toIndex])).toBe(true)
  })
  for (let i = 0; i < result.tiles.length; i += 1) {
    for (let j = i + 1; j < result.tiles.length; j += 1) {
      const a = result.tiles[i]
      const b = result.tiles[j]
      expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).toBe(false)
    }
  }
  return result
}

describe('layoutBidirectionalDominoChain', () => {
  it('fija la ficha inicial real en el centro con una sola ficha', () => {
    const result = expectLayout(chain(1, 0))
    if (!result) return
    const anchor = result.tiles[0]
    expect(anchor.id).toBe('opening')
    expect(anchor.x + anchor.width / 2).toBeCloseTo(viewport.width / 2)
    expect(anchor.y + anchor.height / 2).toBeCloseTo(viewport.height / 2)
  })

  it('mantiene el ancla estable al crecer por izquierda, derecha y ambos lados', () => {
    const base = expectLayout(chain(3, 1))
    const left = expectLayout(chain(4, 2))
    const right = expectLayout(chain(4, 1))
    const both = expectLayout(chain(5, 2))
    if (!base || !left || !right || !both) return
    const position = (result: typeof base) => result.tiles.find((tile) => tile.id === 'opening')!
    for (const result of [left, right, both]) {
      expect(position(result).x).toBeCloseTo(position(base).x)
      expect(position(result).y).toBeCloseTo(position(base).y)
    }
  })

  it.each([7, 14, 21])('preserva orden, geometría y extremos con %i fichas', (count) => {
    const result = expectLayout(chain(count, Math.floor(count / 2)))
    if (!result) return
    expect(result.leftEnd).not.toEqual(result.rightEnd)
    expect(result.leftEnd.x).toBeLessThanOrEqual(result.tiles[0].entry.x + DOMINO_LAYOUT.endZoneGap)
    expect(result.rightEnd.x).toBeGreaterThanOrEqual(result.tiles.at(-1)!.exit.x - DOMINO_LAYOUT.endZoneGap)
  })

  it('permite giros independientes en los dos extremos', () => {
    const result = expectLayout(chain(21, 10))
    if (!result) return
    const leftFlows = result.tiles.slice(0, 10).map((tile) => tile.flowDirection)
    const rightFlows = result.tiles.slice(11).map((tile) => tile.flowDirection)
    expect(leftFlows).toContain('up')
    expect(rightFlows).toContain('down')
  })

  it('gira antes del borde cuando ambas rutas necesitan otra fila', () => {
    const result = expectLayout(chain(19, 9))
    if (!result) return

    const leftTurn = result.tiles.slice(0, 9).find((tile) => tile.flowDirection === 'up')
    const rightTurn = result.tiles.slice(10).find((tile) => tile.flowDirection === 'down')
    expect(leftTurn?.index).toBe(5)
    expect(rightTurn?.index).toBe(13)

    expect(leftTurn!.x).toBeGreaterThan(DOMINO_LAYOUT.margin + DOMINO_LAYOUT.turnLane)
    expect(rightTurn!.x + rightTurn!.width).toBeLessThan(viewport.width - DOMINO_LAYOUT.margin - DOMINO_LAYOUT.turnLane)
  })

  it('mantiene las fichas y giros existentes al extender ambos extremos', () => {
    const state = (leftCount: number, rightCount: number): DominoChainTile[] => [
      ...Array.from({ length: leftCount }, (_, offset) => ({ id: `left-${leftCount - offset}`, isDouble: false })),
      { id: 'opening', isDouble: false },
      ...Array.from({ length: rightCount }, (_, offset) => ({ id: `right-${offset + 1}`, isDouble: false })),
    ]
    const states = [state(0, 0), state(1, 0), state(1, 1), state(2, 1), state(2, 2), state(3, 2), state(3, 3), state(4, 3), state(4, 4)]
    let previous = expectLayout(states[0])
    if (!previous) return

    for (const board of states.slice(1)) {
      const current = expectLayout(board)
      if (!current) return
      for (const previousTile of previous.tiles) {
        const currentTile = current.tiles.find((tile) => tile.id === previousTile.id)
        expect(currentTile).toMatchObject({
          x: previousTile.x,
          y: previousTile.y,
          visualOrientation: previousTile.visualOrientation,
          flowDirection: previousTile.flowDirection,
        })
      }
      previous = current
    }
  })

  it('declara inviable una cadena de 28 fichas cuando el tablero no puede contener otra fila segura', () => {
    const result = layoutBidirectionalDominoChain(chain(28, 14), viewport, 'opening')
    expect(result).toMatchObject({ viable: false })
  })

  it.each([
    ['izquierda', [{ id: 'left-1', isDouble: false }, { id: 'opening', isDouble: false }], [{ id: 'left-2', isDouble: false }, { id: 'left-1', isDouble: false }, { id: 'opening', isDouble: false }]],
    ['derecha', [{ id: 'opening', isDouble: false }, { id: 'right-1', isDouble: false }], [{ id: 'opening', isDouble: false }, { id: 'right-1', isDouble: false }, { id: 'right-2', isDouble: false }]],
  ])('rechaza el giro forzado sin continuación completa a 700 × 500 por %s', (_side, beforeTurn, turn) => {
    expect(layoutBidirectionalDominoChain(beforeTurn, { width: 700, height: 500 }, 'opening')).toMatchObject({ viable: true })
    expect(layoutBidirectionalDominoChain(turn, { width: 700, height: 500 }, 'opening')).toMatchObject({ viable: false, reason: 'insufficient-height' })
  })

  it.each([
    ['izquierda', [{ id: 'left-3', isDouble: false }, { id: 'left-2', isDouble: false }, { id: 'left-1', isDouble: false }, { id: 'opening', isDouble: false }]],
    ['derecha', [{ id: 'opening', isDouble: false }, { id: 'right-1', isDouble: false }, { id: 'right-2', isDouble: false }, { id: 'right-3', isDouble: false }]],
  ])('permite A → B → C cuando el carril completo cabe a 700 × 700 por %s', (_side, board) => {
    const result = expectLayout(board, 'opening', { width: 700, height: 700 })
    if (!result) return
    expect(result.tiles.some((tile) => tile.flowDirection === 'up' || tile.flowDirection === 'down')).toBe(true)
  })

  it.each([
    [[{ id: 'left-3', isDouble: false }, { id: 'left-2', isDouble: true }, { id: 'left-1', isDouble: false }, { id: 'opening', isDouble: false }]],
    [[{ id: 'opening', isDouble: false }, { id: 'right-1', isDouble: false }, { id: 'right-2', isDouble: true }, { id: 'right-3', isDouble: false }]],
  ])('permite que una doble de giro continúe en 700 × 560', (board) => {
    const result = expectLayout(board, 'opening', { width: 700, height: 560 })
    if (!result) return
    const turn = result.tiles.find((tile) => tile.id.endsWith('-2'))
    expect(turn?.visualOrientation).toBe('double-horizontal')
    expect(['up', 'down']).toContain(turn?.flowDirection)
  })

  it('orienta las dobles perpendicularmente al flujo horizontal y vertical', () => {
    const horizontal = expectLayout(chain(3, 1, new Set([2])))
    if (!horizontal) return
    expect(horizontal.tiles[2]).toMatchObject({ visualOrientation: 'double-vertical', flowDirection: 'right' })

    const vertical = expectLayout(chain(4, 0, new Set([2])), 'opening', { width: 600, height: 700 })
    if (!vertical) return
    expect(vertical.tiles[2]).toMatchObject({ visualOrientation: 'double-horizontal', flowDirection: 'down' })
  })

  it('conserva una separación pequeña entre fichas consecutivas', () => {
    const result = expectLayout(chain(8, 3))
    if (!result) return
    result.connections.forEach((connection) => {
      const from = result.tiles[connection.fromIndex]
      const to = result.tiles[connection.toIndex]
      const horizontalGap = Math.min(Math.abs(from.x + from.width - to.x), Math.abs(to.x + to.width - from.x))
      const verticalGap = Math.min(Math.abs(from.y + from.height - to.y), Math.abs(to.y + to.height - from.y))
      expect(Math.min(horizontalGap, verticalGap)).toBeLessThanOrEqual(DOMINO_LAYOUT.tileGap)
    })
  })

  it('declara inviabilidad para una ficha inicial ausente, inválida o un tablero insuficiente', () => {
    const board = chain(3, 1)
    expect(layoutBidirectionalDominoChain(board, viewport, null)).toMatchObject({ viable: false, reason: 'missing-opening-tile' })
    expect(layoutBidirectionalDominoChain(board, viewport, 'unknown')).toMatchObject({ viable: false, reason: 'missing-opening-tile' })
    expect(layoutBidirectionalDominoChain(board, { width: 180, height: 400 }, 'opening')).toMatchObject({ viable: false })
  })
})
