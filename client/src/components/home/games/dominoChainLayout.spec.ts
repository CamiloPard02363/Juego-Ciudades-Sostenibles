import { describe, expect, it } from 'vitest'
import { connectionIsContinuous, DOMINO_LAYOUT, layoutDominoChain, type DominoChainTile } from './dominoChainLayout'

const viewport = { width: 1440, height: 900 }
const chain = (count: number, doubles = new Set<number>()): DominoChainTile[] =>
  Array.from({ length: count }, (_, index) => ({ id: `tile-${index}`, isDouble: doubles.has(index) }))

function expectValidLayout(count: number, doubles = new Set<number>(), size = viewport) {
  const board = chain(count, doubles)
  const original = structuredClone(board)
  const result = layoutDominoChain(board, size)
  expect(result.viable).toBe(true)
  if (!result.viable) return

  expect(board).toEqual(original)
  expect(result.tiles.map((tile) => tile.id)).toEqual(board.map((tile) => tile.id))
  expect(result.connections).toHaveLength(Math.max(0, count - 1))
  result.connections.forEach((connection) => {
    expect(connectionIsContinuous(connection, result.tiles[connection.fromIndex], result.tiles[connection.toIndex])).toBe(true)
    const from = result.tiles[connection.fromIndex]
    const to = result.tiles[connection.toIndex]
    const horizontalGap = Math.min(Math.abs(from.x + from.width - to.x), Math.abs(to.x + to.width - from.x))
    const verticalGap = Math.min(Math.abs(from.y + from.height - to.y), Math.abs(to.y + to.height - from.y))
    const sharesVerticalRun = from.y < to.y + to.height && from.y + from.height > to.y
    const sharesHorizontalRun = from.x < to.x + to.width && from.x + from.width > to.x
    expect(
      (horizontalGap <= DOMINO_LAYOUT.tileGap && sharesVerticalRun)
      || (verticalGap <= DOMINO_LAYOUT.tileGap && sharesHorizontalRun),
    ).toBe(true)
  })
  result.tiles.forEach((tile) => {
    expect(tile.x).toBeGreaterThanOrEqual(DOMINO_LAYOUT.margin)
    expect(tile.y).toBeGreaterThanOrEqual(DOMINO_LAYOUT.margin)
    expect(tile.x + tile.width).toBeLessThanOrEqual(size.width - DOMINO_LAYOUT.margin)
    expect(tile.y + tile.height).toBeLessThanOrEqual(size.height - DOMINO_LAYOUT.margin)
  })
  for (let i = 0; i < result.tiles.length; i += 1) {
    for (let j = i + 1; j < result.tiles.length; j += 1) {
      const a = result.tiles[i]
      const b = result.tiles[j]
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
      expect(overlaps).toBe(false)
    }
  }
  return result
}

describe('layoutDominoChain', () => {
  it.each([3, 8, 15, 25])('mantiene orden, márgenes y continuidad con %i fichas', (count) => {
    expectValidLayout(count, new Set([1, Math.floor(count / 2)]))
  })

  it('usa una ficha vertical de transición al agotar una fila', () => {
    const result = expectValidLayout(15, new Set(), { width: 640, height: 900 })
    expect(result?.connections.some((connection) => connection.kind === 'turn')).toBe(true)
    expect(result?.tiles.some((tile) => tile.orientation === 'vertical' || tile.orientation === 'double-vertical')).toBe(true)
  })

  it('orienta una doble verticalmente cuando ella misma construye el giro', () => {
    const result = expectValidLayout(5, new Set([4]), { width: 740, height: 500 })
    expect(result?.tiles[4]).toMatchObject({ orientation: 'double-vertical', width: 68, height: 124 })
    if (!result) return
    const previous = result.tiles[3]
    const doubleTurn = result.tiles[4]
    expect(doubleTurn.x + doubleTurn.width / 2).toBeCloseTo(previous.x + previous.width)
  })

  it('reserva un carril antes de girar y centra el bloque completo', () => {
    const size = { width: 640, height: 900 }
    const result = expectValidLayout(15, new Set(), size)
    if (!result) return
    const turns = result.tiles.filter((tile) => tile.orientation === 'vertical' || tile.orientation === 'double-vertical')
    expect(turns.length).toBeGreaterThan(0)
    turns.forEach((tile) => {
      expect(tile.x).toBeGreaterThanOrEqual(DOMINO_LAYOUT.margin + 16)
      expect(tile.x + tile.width).toBeLessThanOrEqual(size.width - DOMINO_LAYOUT.margin - 16)
    })
    expect(result.bounds.x + result.bounds.width / 2).toBeCloseTo(size.width / 2)
    expect(result.bounds.y + result.bounds.height / 2).toBeCloseTo(size.height / 2)
  })

  it('ubica los extremos junto al primer y último elemento lógico', () => {
    const result = expectValidLayout(8, new Set([0, 7]))
    if (!result) return
    expect(result.leftEnd.y).toBe(result.tiles[0].entry.y)
    expect(result.rightEnd.y).toBe(result.tiles[7].exit.y)
  })

  it('mantiene una separación visual pequeña entre cada par consecutivo', () => {
    const result = expectValidLayout(15, new Set(), { width: 640, height: 900 })
    if (!result) return
    result.connections.forEach((connection) => {
      const from = result.tiles[connection.fromIndex]
      const to = result.tiles[connection.toIndex]
      const horizontalGap = Math.min(Math.abs(from.x + from.width - to.x), Math.abs(to.x + to.width - from.x))
      const verticalGap = Math.min(Math.abs(from.y + from.height - to.y), Math.abs(to.y + to.height - from.y))
      expect(Math.min(horizontalGap, verticalGap)).toBeCloseTo(DOMINO_LAYOUT.tileGap)
    })
    expect(DOMINO_LAYOUT.tileGap).toBeGreaterThan(0)
  })

  it('declara no viable un tablero demasiado estrecho o bajo', () => {
    expect(layoutDominoChain(chain(3), { width: 180, height: 400 })).toMatchObject({ viable: false, reason: 'insufficient-width' })
    expect(layoutDominoChain(chain(8), { width: 640, height: 120 })).toMatchObject({ viable: false, reason: 'insufficient-height' })
  })
})
