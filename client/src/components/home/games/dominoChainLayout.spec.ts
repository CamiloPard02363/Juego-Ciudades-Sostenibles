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

  it('usa un conector geométrico de giro al agotar una fila', () => {
    const result = expectValidLayout(15, new Set([2, 9]), { width: 640, height: 700 })
    expect(result?.connections.some((connection) => connection.kind === 'turn' && connection.points.length === 4)).toBe(true)
  })

  it('ubica los extremos junto al primer y último elemento lógico', () => {
    const result = expectValidLayout(8, new Set([0, 7]))
    if (!result) return
    expect(result.leftEnd.y).toBe(result.tiles[0].entry.y)
    expect(result.rightEnd.y).toBe(result.tiles[7].exit.y)
  })

  it('declara no viable un tablero demasiado estrecho o bajo', () => {
    expect(layoutDominoChain(chain(3), { width: 180, height: 400 })).toMatchObject({ viable: false, reason: 'insufficient-width' })
    expect(layoutDominoChain(chain(8), { width: 640, height: 120 })).toMatchObject({ viable: false, reason: 'insufficient-height' })
  })
})
