import type { CellPosition } from './mazeCollectorTypes'

type Node = {
  pos: CellPosition
  g: number
  h: number
  f: number
  parent: Node | null
}

function manhattan(a: CellPosition, b: CellPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

function sameCell(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col
}

function isOpen(grid: number[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === 0
}

const DELTAS: readonly CellPosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

/**
 * A* clásico sobre un grid de 4 direcciones sin pesos — heurística Manhattan,
 * admisible porque no hay diagonales ni celdas más "caras" que otras. El
 * open-set es un array simple: el grid más grande del juego (CITY) tiene 425
 * celdas, muy lejos de necesitar un heap binario.
 */
export function findPath(grid: number[][], start: CellPosition, goal: CellPosition): CellPosition[] | null {
  if (!isOpen(grid, start.row, start.col) || !isOpen(grid, goal.row, goal.col)) return null
  if (sameCell(start, goal)) return [start]

  const startNode: Node = { pos: start, g: 0, h: manhattan(start, goal), f: 0, parent: null }
  startNode.f = startNode.g + startNode.h

  const open: Node[] = [startNode]
  const closed = new Set<string>()
  const key = (p: CellPosition) => `${p.row}:${p.col}`

  while (open.length > 0) {
    let bestIndex = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIndex].f) bestIndex = i
    }
    const current = open.splice(bestIndex, 1)[0]

    if (sameCell(current.pos, goal)) {
      const path: CellPosition[] = []
      let node: Node | null = current
      while (node) {
        path.unshift(node.pos)
        node = node.parent
      }
      return path
    }

    closed.add(key(current.pos))

    for (const delta of DELTAS) {
      const nextPos: CellPosition = { row: current.pos.row + delta.row, col: current.pos.col + delta.col }
      if (!isOpen(grid, nextPos.row, nextPos.col)) continue
      if (closed.has(key(nextPos))) continue

      const g = current.g + 1
      const existing = open.find((n) => sameCell(n.pos, nextPos))
      if (existing) {
        if (g < existing.g) {
          existing.g = g
          existing.f = g + existing.h
          existing.parent = current
        }
        continue
      }

      const h = manhattan(nextPos, goal)
      open.push({ pos: nextPos, g, h, f: g + h, parent: current })
    }
  }

  return null
}
