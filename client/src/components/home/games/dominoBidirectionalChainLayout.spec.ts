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

  it.each([3, 8, 15, 25])('preserva orden, geometría y extremos con %i fichas', (count) => {
    const result = expectLayout(chain(count, Math.floor(count / 2)))
    if (!result) return
    expect(result.leftEnd).not.toEqual(result.rightEnd)
    expect(result.leftEnd.x).toBeLessThanOrEqual(result.tiles[0].entry.x + DOMINO_LAYOUT.endZoneGap)
    expect(result.rightEnd.x).toBeGreaterThanOrEqual(result.tiles.at(-1)!.exit.x - DOMINO_LAYOUT.endZoneGap)
  })

  it('permite giros independientes en los dos extremos', () => {
    const result = expectLayout(chain(25, 12))
    if (!result) return
    const leftFlows = result.tiles.slice(0, 12).map((tile) => tile.flowDirection)
    const rightFlows = result.tiles.slice(13).map((tile) => tile.flowDirection)
    expect(leftFlows).toContain('up')
    expect(rightFlows).toContain('down')
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
