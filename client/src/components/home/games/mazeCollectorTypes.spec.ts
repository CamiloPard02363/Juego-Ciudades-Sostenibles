import { describe, expect, it } from 'vitest'
import { MAZE_LAYOUTS } from './mazeCollectorTypes'

/** BFS desde una celda abierta cualquiera — cuenta cuántas celdas abiertas son alcanzables. */
function countReachableOpenCells(grid: number[][]): number {
  const rows = grid.length
  const cols = grid[0].length
  const start = (() => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) return { r, c }
      }
    }
    throw new Error('sin celdas abiertas')
  })()

  const visited = new Set<string>([`${start.r}:${start.c}`])
  const queue = [start]
  while (queue.length > 0) {
    const { r, c } = queue.shift()!
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr
      const nc = c + dc
      // A propósito NO envuelve por el túnel acá: se quiere verificar que la
      // red de calles en sí (sin contar el atajo de teletransporte) ya esté
      // conectada de punta a punta.
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] !== 0) continue
      const key = `${nr}:${nc}`
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({ r: nr, c: nc })
    }
  }
  return visited.size
}

function totalOpenCells(grid: number[][]): number {
  return grid.flat().filter((cell) => cell === 0).length
}

describe('MAZE_LAYOUTS — puertas de teletransporte', () => {
  it('los 4 layouts tienen al menos una fila de túnel con los dos extremos abiertos', () => {
    for (const name of ['CLASSIC', 'CROSS', 'SPIRAL', 'CITY'] as const) {
      const layout = MAZE_LAYOUTS[name]
      expect(layout.tunnelRows.length).toBeGreaterThan(0)
      for (const row of layout.tunnelRows) {
        expect(layout.grid[row][0]).toBe(0)
        expect(layout.grid[row][layout.cols - 1]).toBe(0)
      }
    }
  })

  it('el mapa de Ciudad Sostenible tiene puerta en las 5 avenidas del SVG (y=50/180/300/420/550)', () => {
    // Cada avenida del SVG mide entre 35 y 40px de alto — según cómo caiga
    // sobre la cuadrícula de 20px, puede rasterizarse en 1 o 2 filas
    // contiguas (no siempre 1:1), así que se verifica que exista AL MENOS
    // una fila de túnel cerca del centro esperado de cada avenida, no un
    // conteo total exacto.
    const avenueCentersY = [50, 180, 300, 420, 550]
    for (const centerY of avenueCentersY) {
      const expectedRow = Math.floor(centerY / 20)
      const hasNearbyTunnelRow = MAZE_LAYOUTS.CITY.tunnelRows.some((row) => Math.abs(row - expectedRow) <= 1)
      expect(hasNearbyTunnelRow).toBe(true)
    }
  })

  it('las 4 esquinas de nubes siguen siendo exactamente 4 en los 4 layouts', () => {
    for (const name of ['CLASSIC', 'CROSS', 'SPIRAL', 'CITY'] as const) {
      expect(MAZE_LAYOUTS[name].enemySpawns).toHaveLength(4)
    }
  })
})

describe('MAZE_LAYOUTS — conectividad', () => {
  it('cada celda libre es alcanzable desde cualquier otra en los 4 layouts (sin bolsones aislados)', () => {
    for (const name of ['CLASSIC', 'CROSS', 'SPIRAL', 'CITY'] as const) {
      const { grid } = MAZE_LAYOUTS[name]
      expect(countReachableOpenCells(grid)).toBe(totalOpenCells(grid))
    }
  })

  it('el arranque del jugador y las 4 esquinas de nubes del mapa Ciudad Sostenible caen en calle transitable', () => {
    const layout = MAZE_LAYOUTS.CITY
    expect(layout.grid[layout.playerStart.row][layout.playerStart.col]).toBe(0)
    for (const spawn of layout.enemySpawns) {
      expect(layout.grid[spawn.row][spawn.col]).toBe(0)
    }
  })
})
