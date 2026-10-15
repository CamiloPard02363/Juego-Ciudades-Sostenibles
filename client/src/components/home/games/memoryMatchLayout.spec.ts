import { describe, expect, it } from 'vitest'
import { bestBoardGrid, MAX_PAIRS_PER_ZONE, zonePairSizes } from './memoryMatchLayout'

describe('zonePairSizes', () => {
  it('reparte en partes iguales sin pasar del máximo por zona', () => {
    expect(zonePairSizes(4, 8)).toEqual([4])
    expect(zonePairSizes(8, 8)).toEqual([4, 4])
    expect(zonePairSizes(10, 8)).toEqual([5, 5])
    expect(zonePairSizes(12, 8)).toEqual([6, 6])
    expect(zonePairSizes(16, 8)).toEqual([6, 5, 5])
  })

  it('respeta un máximo menor puesto por quien creó el juego', () => {
    expect(zonePairSizes(8, 3)).toEqual([3, 3, 2])
  })

  it('nunca supera el máximo', () => {
    for (let total = 1; total <= 40; total++) {
      const sizes = zonePairSizes(total, 20)
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(total)
      expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_PAIRS_PER_ZONE)
    }
  })
})

describe('bestBoardGrid', () => {
  it('cabe siempre en el espacio disponible', () => {
    for (const [w, h] of [[1280, 520], [390, 600], [800, 300]]) {
      const grid = bestBoardGrid(12, w, h, 10)
      expect(grid.cols * grid.cardWidth + (grid.cols - 1) * 10).toBeLessThanOrEqual(w)
      expect(grid.rows * grid.cardHeight + (grid.rows - 1) * 10).toBeLessThanOrEqual(h)
    }
  })

  it('en pantalla ancha usa pocas filas; en celular vertical, más filas', () => {
    expect(bestBoardGrid(12, 1280, 520, 10).rows).toBe(2)
    expect(bestBoardGrid(12, 390, 600, 10).cols).toBeLessThanOrEqual(4)
  })
})
