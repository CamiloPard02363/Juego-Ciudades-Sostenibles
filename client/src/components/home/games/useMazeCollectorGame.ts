import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CellPosition, MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef } from './mazeCollectorTypes'
import { celebrateMatch, primeGameFeedback, signalMismatch } from '../../../utils/gameFeedback'

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type MazePhase = 'ready' | 'playing' | 'won' | 'lost'

const DIRECTION_DELTAS: Record<Direction, CellPosition> = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',
  s: 'DOWN',
  a: 'LEFT',
  d: 'RIGHT',
}

/** Puntos por objeto recolectado. Fijo — no hay combo/tiempo en este juego, a diferencia de Memory Match. */
const POINTS_PER_ITEM = 100
/** Duración de cada "paso" del jugador: entre más chico, más ágil se siente el control. */
const TICK_MS = 180

type MazeGameState = {
  playerPos: CellPosition
  facing: Direction
  desiredDirection: Direction | null
  enemyPositions: CellPosition[]
  collectedItemIds: string[]
  remainingItemPositions: Array<{ itemId: string; position: CellPosition }>
  lives: number
  score: number
  phase: MazePhase
  lastCollected: MazeCollectorItem | null
}

function isOpen(grid: number[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === 0
}

function samePos(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col
}

function openNeighbors(grid: number[][], pos: CellPosition): CellPosition[] {
  return (Object.values(DIRECTION_DELTAS) as CellPosition[])
    .map((delta) => ({ row: pos.row + delta.row, col: pos.col + delta.col }))
    .filter((next) => isOpen(grid, next.row, next.col))
}

/** 70% se mueve hacia el jugador (distancia Manhattan), 30% al azar entre direcciones abiertas — nada de pathfinding. */
function chooseEnemyMove(grid: number[][], enemyPos: CellPosition, playerPos: CellPosition): CellPosition {
  const neighbors = openNeighbors(grid, enemyPos)
  if (neighbors.length === 0) return enemyPos

  if (Math.random() < 0.3) {
    return neighbors[Math.floor(Math.random() * neighbors.length)]
  }

  let best = neighbors[0]
  let bestDistance = Infinity
  for (const candidate of neighbors) {
    const distance = Math.abs(candidate.row - playerPos.row) + Math.abs(candidate.col - playerPos.col)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  return best
}

function buildInitialState(layout: MazeLayoutDef, items: MazeCollectorItem[], lives: number): MazeGameState {
  const slots = layout.itemSlots.slice(0, items.length)
  return {
    playerPos: layout.playerStart,
    facing: 'RIGHT',
    desiredDirection: null,
    enemyPositions: layout.enemySpawns.map((spawn) => ({ ...spawn })),
    collectedItemIds: [],
    remainingItemPositions: items.map((item, index) => ({ itemId: item.itemId, position: slots[index] })),
    lives,
    score: 0,
    phase: 'ready',
    lastCollected: null,
  }
}

export type UseMazeCollectorGameOptions = {
  layout: MazeLayoutDef
  items: MazeCollectorItem[]
  config: MazeCollectorConfig
}

export function useMazeCollectorGame({ layout, items, config }: UseMazeCollectorGameOptions) {
  const itemsById = useMemo(() => new Map(items.map((item) => [item.itemId, item])), [items])

  const [state, setState] = useState<MazeGameState>(() => buildInitialState(layout, items, config.lives))
  const tickCountRef = useRef(0)

  const setDirection = useCallback((direction: Direction) => {
    primeGameFeedback()
    setState((current) => ({
      ...current,
      desiredDirection: direction,
      phase: current.phase === 'ready' ? 'playing' : current.phase,
    }))
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const direction = KEY_TO_DIRECTION[event.key]
      if (!direction) return
      event.preventDefault()
      setDirection(direction)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setDirection])

  const enemyTickInterval = Math.max(1, 4 - config.enemySpeed)

  useEffect(() => {
    if (state.phase !== 'playing') return

    const interval = setInterval(() => {
      setState((current) => {
        if (current.phase !== 'playing') return current

        let { playerPos, facing } = current
        const tryMove = (direction: Direction | null): CellPosition | null => {
          if (!direction) return null
          const delta = DIRECTION_DELTAS[direction]
          const next = { row: playerPos.row + delta.row, col: playerPos.col + delta.col }
          return isOpen(layout.grid, next.row, next.col) ? next : null
        }

        const movedViaDesired = tryMove(current.desiredDirection)
        const moved = movedViaDesired ?? tryMove(current.facing)
        if (moved) {
          playerPos = moved
          facing = movedViaDesired ? (current.desiredDirection as Direction) : facing
        }

        let { remainingItemPositions, collectedItemIds, score, lastCollected } = current
        const collectedHere = remainingItemPositions.find((entry) => samePos(entry.position, playerPos))
        if (collectedHere) {
          remainingItemPositions = remainingItemPositions.filter((entry) => entry.itemId !== collectedHere.itemId)
          collectedItemIds = [...collectedItemIds, collectedHere.itemId]
          score += POINTS_PER_ITEM
          lastCollected = itemsById.get(collectedHere.itemId) ?? null
          celebrateMatch()
        }

        let enemyPositions = current.enemyPositions
        tickCountRef.current += 1
        if (tickCountRef.current % enemyTickInterval === 0) {
          enemyPositions = enemyPositions.map((enemyPos) => chooseEnemyMove(layout.grid, enemyPos, playerPos))
        }

        const hitByEnemy = enemyPositions.some((enemyPos) => samePos(enemyPos, playerPos))
        if (hitByEnemy) {
          signalMismatch()
          const lives = current.lives - 1
          if (lives <= 0) {
            return { ...current, playerPos, facing, enemyPositions, lives: 0, phase: 'lost' }
          }
          return {
            ...current,
            playerPos: layout.playerStart,
            facing: 'RIGHT',
            desiredDirection: null,
            enemyPositions: layout.enemySpawns.map((spawn) => ({ ...spawn })),
            lives,
            remainingItemPositions,
            collectedItemIds,
            score,
            lastCollected,
          }
        }

        const won = remainingItemPositions.length === 0
        return {
          ...current,
          playerPos,
          facing,
          enemyPositions,
          remainingItemPositions,
          collectedItemIds,
          score,
          lastCollected,
          phase: won ? 'won' : current.phase,
        }
      })
    }, TICK_MS)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, layout, enemyTickInterval, itemsById])

  const totalItems = items.length
  const collectedCount = state.collectedItemIds.length

  return {
    ...state,
    totalItems,
    collectedCount,
    setDirection,
  }
}
