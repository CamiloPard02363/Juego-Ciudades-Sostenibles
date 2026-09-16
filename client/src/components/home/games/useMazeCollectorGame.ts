import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CellPosition, MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef, ZoneType } from './mazeCollectorTypes'
import { celebrateMatch, primeGameFeedback, signalMismatch } from '../../../utils/gameFeedback'
import {
  chooseEnemyMove,
  createEnemyRuntimeState,
  ENERGY_MAX,
  ENERGY_DECAY_PER_TICK,
  ZONE_QUESTION_ENERGY_BONUS,
  SUPER_COLLECT_TICKS,
  DEFAULT_ITEM_POINTS,
  isTriggerZone,
  pointsForItem,
  samePos,
} from './mazeCollectorEngine'
import type { EnemyRuntimeState, TriggerZoneType } from './mazeCollectorEngine'

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

/** Duración de cada "paso" del jugador. 260ms (antes 180) le da tiempo de pensar en vez de sentirse arcade frenético. */
const TICK_MS = 260

/** Una pregunta de zona pendiente, junto a la etiqueta de la zona que la disparó (para el modal). */
export type PendingZoneQuestion = {
  zone: TriggerZoneType
  item: MazeCollectorItem
}

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
  /** Ítem recién recolectado con pregunta pendiente por responder — mientras exista, el tick del juego está pausado. */
  pendingQuestion: MazeCollectorItem | null
  /** Pregunta de zona pendiente (Escuela/Centro de Reciclaje) — mismo efecto de pausa que pendingQuestion. */
  pendingZoneQuestion: PendingZoneQuestion | null
  /** Energía del camión (0-100). Al llegar a 0 resta una vida y recarga, igual que chocar con un enemigo. */
  energy: number
  /** Última zona de trigger visitada — evita reactivar la misma pregunta si el jugador se queda parado. */
  lastZoneId: ZoneType | null
  /** Ticks restantes de "Super-Recogida": mientras > 0, todos los enemigos huyen. */
  superCollectTicksLeft: number
}

function isOpen(grid: number[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && grid[row][col] === 0
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
    pendingQuestion: null,
    pendingZoneQuestion: null,
    energy: ENERGY_MAX,
    lastZoneId: null,
    superCollectTicksLeft: 0,
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
  const enemiesRuntimeRef = useRef<EnemyRuntimeState[]>(layout.enemySpawns.map((spawn) => createEnemyRuntimeState({ ...spawn })))

  useEffect(() => {
    enemiesRuntimeRef.current = layout.enemySpawns.map((spawn) => createEnemyRuntimeState({ ...spawn }))
  }, [layout])

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
        if (current.phase !== 'playing' || current.pendingQuestion || current.pendingZoneQuestion) return current

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

        // Energía decae mientras se juega; al agotarse, misma penalización que chocar con un enemigo.
        const energy = Math.max(0, current.energy - ENERGY_DECAY_PER_TICK)

        // Trigger de zona: entrar a una celda de Escuela/Centro de Reciclaje dispara su pregunta,
        // solo si es una zona distinta a la última visitada (evita reactivar en bucle si se queda parado).
        const zoneAtPlayer = layout.zones?.[playerPos.row]?.[playerPos.col] ?? null
        if (isTriggerZone(zoneAtPlayer) && zoneAtPlayer !== current.lastZoneId) {
          const question = zoneAtPlayer === 'school' ? config.schoolQuestion : config.recyclingQuestion
          if (question) {
            return {
              ...current,
              playerPos,
              facing,
              energy,
              lastZoneId: zoneAtPlayer,
              pendingZoneQuestion: {
                zone: zoneAtPlayer,
                item: {
                  itemId: `zone-${zoneAtPlayer}`,
                  label: zoneAtPlayer === 'school' ? 'Escuela' : 'Centro de Reciclaje',
                  icon: zoneAtPlayer === 'school' ? 'building' : 'recycle',
                  color: '#22c55e',
                  question,
                },
              },
            }
          }
        }
        // Fuera de una zona trigger, limpia lastZoneId para permitir que la
        // misma pregunta se dispare de nuevo si el jugador vuelve a entrar.
        const lastZoneId = zoneAtPlayer

        let { remainingItemPositions, collectedItemIds, score, lastCollected } = current
        let superCollectTicksLeft = Math.max(0, current.superCollectTicksLeft - 1)
        const collectedHere = remainingItemPositions.find((entry) => samePos(entry.position, playerPos))
        if (collectedHere) {
          remainingItemPositions = remainingItemPositions.filter((entry) => entry.itemId !== collectedHere.itemId)
          collectedItemIds = [...collectedItemIds, collectedHere.itemId]
          lastCollected = itemsById.get(collectedHere.itemId) ?? null

          // Si trae pregunta, se pausa el juego para responderla antes de sumar el
          // punto — el enemigo no avanza en este mismo tick para no golpear al
          // jugador justo cuando se abre el modal.
          if (lastCollected?.question) {
            return {
              ...current,
              playerPos,
              facing,
              energy,
              lastZoneId,
              remainingItemPositions,
              collectedItemIds,
              lastCollected,
              pendingQuestion: lastCollected,
              superCollectTicksLeft,
            }
          }

          if (lastCollected?.isPowerUp) {
            superCollectTicksLeft = SUPER_COLLECT_TICKS
          } else {
            score += pointsForItem(lastCollected?.wasteType)
          }
          celebrateMatch()
        }

        const fleeing = superCollectTicksLeft > 0
        let enemyPositions = current.enemyPositions
        tickCountRef.current += 1
        if (tickCountRef.current % enemyTickInterval === 0) {
          enemyPositions = enemiesRuntimeRef.current.map((enemyRuntime) => {
            const next = chooseEnemyMove(layout.grid, enemyRuntime, playerPos, fleeing)
            enemyRuntime.pos = next
            return next
          })
        }

        // Durante el modo huida, chocar con una nube la "atrapa" (vuelve a su
        // spawn) en vez de restarle vida al jugador — refuerza la lectura de
        // "ahora soy yo quien da miedo" del power-up.
        const hitIndex = enemyPositions.findIndex((enemyPos) => samePos(enemyPos, playerPos))
        if (hitIndex !== -1 && fleeing) {
          const spawn = layout.enemySpawns[hitIndex]
          enemyPositions = enemyPositions.map((pos, index) => (index === hitIndex ? { ...spawn } : pos))
          enemiesRuntimeRef.current[hitIndex] = createEnemyRuntimeState({ ...spawn })
          celebrateMatch()
          return {
            ...current,
            playerPos,
            facing,
            energy,
            lastZoneId,
            enemyPositions,
            remainingItemPositions,
            collectedItemIds,
            score: score + DEFAULT_ITEM_POINTS,
            lastCollected,
            superCollectTicksLeft,
          }
        }

        const outOfEnergy = energy <= 0
        if ((hitIndex !== -1 && !fleeing) || outOfEnergy) {
          signalMismatch()
          const lives = current.lives - 1
          if (lives <= 0) {
            return { ...current, playerPos, facing, energy: 0, enemyPositions, lives: 0, phase: 'lost' }
          }
          enemiesRuntimeRef.current = layout.enemySpawns.map((spawn) => createEnemyRuntimeState({ ...spawn }))
          return {
            ...current,
            playerPos: layout.playerStart,
            facing: 'RIGHT',
            desiredDirection: null,
            energy: ENERGY_MAX,
            lastZoneId: null,
            enemyPositions: layout.enemySpawns.map((spawn) => ({ ...spawn })),
            lives,
            remainingItemPositions,
            collectedItemIds,
            score,
            lastCollected,
            superCollectTicksLeft: 0,
          }
        }

        const won = remainingItemPositions.length === 0
        return {
          ...current,
          playerPos,
          facing,
          energy,
          lastZoneId,
          enemyPositions,
          remainingItemPositions,
          collectedItemIds,
          score,
          lastCollected,
          superCollectTicksLeft,
          phase: won ? 'won' : current.phase,
        }
      })
    }, TICK_MS)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, layout, enemyTickInterval, itemsById, config.schoolQuestion, config.recyclingQuestion])

  /** Responde la pregunta pendiente de un ítem: acierto suma el punto, fallo solo da feedback — en ambos casos reanuda el juego. */
  const answerQuestion = useCallback((selectedIndex: number) => {
    setState((current) => {
      const collected = current.pendingQuestion
      const question = collected?.question
      if (!question) return current

      const correct = selectedIndex === question.correctOptionIndex
      if (correct) {
        celebrateMatch()
      } else {
        signalMismatch()
      }

      const won = current.remainingItemPositions.length === 0
      return {
        ...current,
        score: correct ? current.score + pointsForItem(collected.wasteType) : current.score,
        pendingQuestion: null,
        phase: won ? 'won' : current.phase,
      }
    })
  }, [])

  /** Responde la pregunta pendiente de zona: acierto da bono de energía (+toneladas si es reciclaje), fallo solo da feedback. */
  const answerZoneQuestion = useCallback((selectedIndex: number) => {
    setState((current) => {
      const pending = current.pendingZoneQuestion
      const question = pending?.item.question
      if (!pending || !question) return current

      const correct = selectedIndex === question.correctOptionIndex
      if (correct) {
        celebrateMatch()
      } else {
        signalMismatch()
      }

      const energyBonus = correct ? ZONE_QUESTION_ENERGY_BONUS : 0
      const scoreBonus = correct && pending.zone === 'recycling_center' ? DEFAULT_ITEM_POINTS : 0

      return {
        ...current,
        energy: Math.min(ENERGY_MAX, current.energy + energyBonus),
        score: current.score + scoreBonus,
        pendingZoneQuestion: null,
      }
    })
  }, [])

  const totalItems = items.length
  const collectedCount = state.collectedItemIds.length

  return {
    ...state,
    totalItems,
    collectedCount,
    setDirection,
    answerQuestion,
    answerZoneQuestion,
  }
}
