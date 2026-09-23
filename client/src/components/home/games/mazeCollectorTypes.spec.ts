import { describe, expect, it } from 'vitest'
import { MAZE_LAYOUTS } from './mazeCollectorTypes'

describe('MAZE_LAYOUTS — puertas de teletransporte', () => {
  it('los 4 layouts tienen una fila de túnel con los dos extremos abiertos', () => {
    for (const name of ['CLASSIC', 'CROSS', 'SPIRAL', 'CITY'] as const) {
      const layout = MAZE_LAYOUTS[name]
      expect(layout.tunnelRow).not.toBeNull()
      const row = layout.tunnelRow as number
      expect(layout.grid[row][0]).toBe(0)
      expect(layout.grid[row][layout.cols - 1]).toBe(0)
    }
  })

  it('las 4 esquinas de nubes siguen siendo exactamente 4 en los 4 layouts', () => {
    for (const name of ['CLASSIC', 'CROSS', 'SPIRAL', 'CITY'] as const) {
      expect(MAZE_LAYOUTS[name].enemySpawns).toHaveLength(4)
    }
  })
})
