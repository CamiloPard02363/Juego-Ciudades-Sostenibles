import { useCallback, useEffect, useRef, useState } from 'react'
import type { CellPosition, MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef } from './mazeCollectorTypes'
import {
  bonusThresholds,
  buildLevelBoard,
  chooseGhostDirection,
  comboPointsFor,
  computeGhostTarget,
  isOpen,
  samePos,
  stepWithTeleport,
  BONUS_LIFETIME_MS,
  POINTS_BONUS,
  POINTS_PET,
  POINTS_POWER,
  POWER_MODE_MS,
  SLOW_TRAP_FACTOR,
  SLOW_TRAP_MS,
} from './mazeEngine'
import type { Collectible, Direction, GhostPersonality } from './mazeEngine'
import { celebrateMatch, primeGameFeedback, signalMismatch } from '../../../utils/gameFeedback'

export type { Direction }
export type MazePhase = 'ready' | 'playing' | 'levelup' | 'lost'
export type GhostMode = 'NORMAL' | 'FRIGHTENED' | 'EATEN'

const REVERSE_DIRECTION: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
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

const PLAYER_BASE_SPEED = 4.5 // celdas/seg
const GHOST_BASE_SPEED = 2.6
const GHOST_SPEED_PER_CONFIG_STEP = 0.5
const GHOST_LEVEL_GROWTH = 1.08
const MAX_LEVEL_GROWTH_STEPS = 6
const FRIGHTENED_SPEED_FACTOR = 0.55
const EATEN_SPEED_FACTOR = 2.4
/** Distancia (en celdas) por debajo de la cual el camión y una nube se consideran "tocándose". */
const COLLISION_RADIUS = 0.6
/** Nunca dejar que un frame con lag (pestaña en segundo plano, etc.) mueva a alguien varias celdas de un salto. */
const MAX_DELTA_SECONDS = 0.05
const LEVELUP_PAUSE_MS = 1600

/**
 * Las 4 nubes son fijas: mismo orden que `layout.enemySpawns` (que ya viene
 * como 4 esquinas por diseño de mazeCollectorTypes.ts). Cada una usa su
 * propio spawn como pivote de patrulla (Polución Industrial) — no hace
 * falta un dato de layout aparte para eso.
 */
const GHOST_PERSONALITIES: { personality: GhostPersonality; name: string }[] = [
  { personality: 'CHASER', name: 'Smog Gris' },
  { personality: 'AMBUSHER', name: 'Gas Tóxico' },
  { personality: 'PATROLLER', name: 'Polución Industrial' },
  { personality: 'RANDOM', name: 'Lluvia Ácida' },
]

type Moving = {
  pos: CellPosition
  nextPos: CellPosition
  /** 0 = recién salió de `pos`, 1 = llegó a `nextPos` (ahí se decide el próximo paso). */
  progress: number
  facing: Direction
}

type InternalGhost = Moving & {
  id: string
  name: string
  personality: GhostPersonality
  pivot: CellPosition
  spawn: CellPosition
  mode: GhostMode
}

type InternalPlayer = Moving & {
  desiredDirection: Direction | null
  slowUntil: number
}

type ActiveBonus = {
  id: string
  item: MazeCollectorItem
  pos: CellPosition
  expiresAt: number
}

type InternalState = {
  phase: MazePhase
  level: number
  score: number
  lives: number
  /** Config.enemySpeed no cambia durante la partida — se guarda acá una sola vez. */
  baseEnemySpeed: number
  player: InternalPlayer
  ghosts: InternalGhost[]
  pickups: Collectible[]
  bags: Collectible[]
  bonusQueue: MazeCollectorItem[]
  bonusThresholdsRemaining: number[]
  bonusSpawnPoint: CellPosition
  activeBonus: ActiveBonus | null
  petTotalThisLevel: number
  petCollectedThisLevel: number
  energizedUntil: number | null
  comboIndex: number
  lastCollected: MazeCollectorItem | null
  levelUpUntil: number | null
}

function ghostSpeed(level: number, enemySpeedConfig: number): number {
  const growthSteps = Math.min(level - 1, MAX_LEVEL_GROWTH_STEPS)
  const base = GHOST_BASE_SPEED + (enemySpeedConfig - 1) * GHOST_SPEED_PER_CONFIG_STEP
  return base * Math.pow(GHOST_LEVEL_GROWTH, growthSteps)
}

function spawnGhosts(layout: MazeLayoutDef): InternalGhost[] {
  return layout.enemySpawns.map((spawn, index) => {
    const def = GHOST_PERSONALITIES[index % GHOST_PERSONALITIES.length]
    return {
      id: `ghost-${index}`,
      name: def.name,
      personality: def.personality,
      pos: { ...spawn },
      nextPos: { ...spawn },
      progress: 0,
      facing: 'UP',
      pivot: { ...spawn },
      spawn: { ...spawn },
      mode: 'NORMAL',
    }
  })
}

function resetPlayer(layout: MazeLayoutDef): InternalPlayer {
  return {
    pos: { ...layout.playerStart },
    nextPos: { ...layout.playerStart },
    progress: 0,
    facing: 'RIGHT',
    desiredDirection: null,
    slowUntil: 0,
  }
}

/** Arma un tablero nuevo — se llama al empezar la partida y cada vez que se limpia un nivel. */
function startLevel(layout: MazeLayoutDef, items: MazeCollectorItem[]): {
  pickups: Collectible[]
  bags: Collectible[]
  bonusQueue: MazeCollectorItem[]
  bonusThresholdsRemaining: number[]
  bonusSpawnPoint: CellPosition
  petTotalThisLevel: number
} {
  const board = buildLevelBoard(layout)
  const petTotalThisLevel = board.pickups.filter((p) => p.kind === 'PET').length
  return {
    pickups: board.pickups,
    bags: board.bags,
    bonusQueue: [...items],
    bonusThresholdsRemaining: bonusThresholds(items.length),
    bonusSpawnPoint: board.bonusSpawnPoint,
    petTotalThisLevel,
  }
}

function createInitialState(layout: MazeLayoutDef, items: MazeCollectorItem[], config: MazeCollectorConfig): InternalState {
  const { pickups, bags, bonusQueue, bonusThresholdsRemaining, bonusSpawnPoint, petTotalThisLevel } = startLevel(
    layout,
    items,
  )
  return {
    phase: 'ready',
    level: 1,
    score: 0,
    lives: config.lives,
    baseEnemySpeed: config.enemySpeed,
    player: resetPlayer(layout),
    ghosts: spawnGhosts(layout),
    pickups,
    bags,
    bonusQueue,
    bonusThresholdsRemaining,
    bonusSpawnPoint,
    activeBonus: null,
    petTotalThisLevel,
    petCollectedThisLevel: 0,
    energizedUntil: null,
    comboIndex: 0,
    lastCollected: null,
    levelUpUntil: null,
  }
}

function tryDirectionFrom(layout: MazeLayoutDef, pos: CellPosition, direction: Direction | null): CellPosition | null {
  if (!direction) return null
  const next = stepWithTeleport(pos, direction, layout.cols, layout.tunnelRows)
  return isOpen(layout.grid, next.row, next.col) ? next : null
}

/** Avanza una entidad "moving" genérica un `speed * dt` de progreso; si llega, la deja lista en la nueva celda con progress=0 y devuelve true (para que el llamador decida el próximo paso y resuelva colisiones). */
function advance(entity: Moving, speed: number, dt: number): boolean {
  if (samePos(entity.pos, entity.nextPos)) {
    entity.progress = 0
    return false
  }
  entity.progress = Math.min(1, entity.progress + speed * dt)
  if (entity.progress < 1) return false
  entity.pos = entity.nextPos
  entity.progress = 0
  return true
}

function tickPlayer(state: InternalState, layout: MazeLayoutDef, now: number, dt: number) {
  const player = state.player
  const speed = PLAYER_BASE_SPEED * (now < player.slowUntil ? SLOW_TRAP_FACTOR : 1)
  const arrived = advance(player, speed, dt)

  if (arrived || samePos(player.pos, player.nextPos)) {
    const viaDesired = tryDirectionFrom(layout, player.pos, player.desiredDirection)
    const viaFacing = viaDesired ?? tryDirectionFrom(layout, player.pos, player.facing)
    if (viaDesired) player.facing = player.desiredDirection as Direction
    player.nextPos = viaFacing ?? player.pos
  }

  if (arrived) resolvePlayerArrival(state, now)
}

function resolvePlayerArrival(state: InternalState, now: number) {
  const pos = state.player.pos

  const pickupIndex = state.pickups.findIndex((p) => samePos(p.pos, pos))
  if (pickupIndex !== -1) {
    const [picked] = state.pickups.splice(pickupIndex, 1)
    if (picked.kind === 'PET') {
      state.score += POINTS_PET
      state.petCollectedThisLevel += 1
    } else {
      state.score += POINTS_POWER
      state.energizedUntil = now + POWER_MODE_MS
      state.comboIndex = 0
      for (const ghost of state.ghosts) {
        if (ghost.mode === 'NORMAL') {
          ghost.mode = 'FRIGHTENED'
          ghost.facing = REVERSE_DIRECTION[ghost.facing]
        }
      }
    }
    celebrateMatch()
  }

  const bagIndex = state.bags.findIndex((b) => samePos(b.pos, pos))
  if (bagIndex !== -1 && !(state.energizedUntil && now < state.energizedUntil)) {
    state.bags.splice(bagIndex, 1)
    state.player.slowUntil = now + SLOW_TRAP_MS
  }

  if (state.activeBonus && samePos(state.activeBonus.pos, pos)) {
    state.score += POINTS_BONUS
    state.lastCollected = state.activeBonus.item
    state.activeBonus = null
    celebrateMatch()
  }

  maybeSpawnBonus(state, now)

  if (state.pickups.length === 0) {
    state.phase = 'levelup'
    state.levelUpUntil = now + LEVELUP_PAUSE_MS
  }
}

function maybeSpawnBonus(state: InternalState, now: number) {
  if (state.activeBonus) return
  if (state.bonusQueue.length === 0 || state.bonusThresholdsRemaining.length === 0) return
  const ratio = state.petTotalThisLevel > 0 ? state.petCollectedThisLevel / state.petTotalThisLevel : 1
  if (ratio < state.bonusThresholdsRemaining[0]) return

  state.bonusThresholdsRemaining.shift()
  const item = state.bonusQueue.shift()
  if (!item) return
  state.activeBonus = {
    id: `bonus-${item.itemId}`,
    item,
    pos: state.bonusSpawnPoint,
    expiresAt: now + BONUS_LIFETIME_MS,
  }
}

function tickGhost(ghost: InternalGhost, state: InternalState, layout: MazeLayoutDef, dt: number) {
  if (ghost.mode === 'EATEN' && samePos(ghost.pos, ghost.spawn) && samePos(ghost.pos, ghost.nextPos)) {
    ghost.mode = 'NORMAL'
  }

  const speedFactor = ghost.mode === 'FRIGHTENED' ? FRIGHTENED_SPEED_FACTOR : ghost.mode === 'EATEN' ? EATEN_SPEED_FACTOR : 1
  const speed = ghostSpeed(state.level, state.baseEnemySpeed) * speedFactor
  const arrived = advance(ghost, speed, dt)

  if (arrived || samePos(ghost.pos, ghost.nextPos)) {
    const target =
      ghost.mode === 'EATEN'
        ? ghost.spawn
        : computeGhostTarget(ghost.personality, layout.grid, ghost, {
            pos: state.player.pos,
            facing: state.player.facing,
          })
    const frightened = ghost.mode === 'FRIGHTENED'
    const direction = chooseGhostDirection(
      layout.grid,
      ghost.pos,
      ghost.facing,
      target,
      ghost.personality,
      frightened,
      Math.random,
      layout.tunnelRows,
    )
    ghost.facing = direction
    ghost.nextPos = stepWithTeleport(ghost.pos, direction, layout.cols, layout.tunnelRows)
  }
}

function interpolated(entity: Moving): { row: number; col: number } {
  return {
    row: entity.pos.row + (entity.nextPos.row - entity.pos.row) * entity.progress,
    col: entity.pos.col + (entity.nextPos.col - entity.pos.col) * entity.progress,
  }
}

function resolveGhostCollisions(state: InternalState, layout: MazeLayoutDef) {
  const playerPoint = interpolated(state.player)

  for (const ghost of state.ghosts) {
    if (ghost.mode === 'EATEN') continue
    const ghostPoint = interpolated(ghost)
    const distance = Math.hypot(playerPoint.row - ghostPoint.row, playerPoint.col - ghostPoint.col)
    if (distance > COLLISION_RADIUS) continue

    if (ghost.mode === 'FRIGHTENED') {
      ghost.mode = 'EATEN'
      ghost.nextPos = ghost.pos
      ghost.progress = 0
      state.score += comboPointsFor(state.comboIndex)
      state.comboIndex += 1
      celebrateMatch()
      continue
    }

    signalMismatch()
    state.lives -= 1
    if (state.lives <= 0) {
      state.phase = 'lost'
      return
    }
    state.player = resetPlayer(layout)
    state.ghosts = spawnGhosts(layout)
    state.energizedUntil = null
    state.comboIndex = 0
    return
  }
}

function tickEngine(state: InternalState, layout: MazeLayoutDef, items: MazeCollectorItem[], now: number, dtRaw: number) {
  const dt = Math.min(dtRaw, MAX_DELTA_SECONDS)

  if (state.phase === 'levelup') {
    if (state.levelUpUntil !== null && now >= state.levelUpUntil) {
      const { pickups, bags, bonusQueue, bonusThresholdsRemaining, bonusSpawnPoint, petTotalThisLevel } = startLevel(
        layout,
        items,
      )
      state.level += 1
      state.pickups = pickups
      state.bags = bags
      state.bonusQueue = bonusQueue
      state.bonusThresholdsRemaining = bonusThresholdsRemaining
      state.bonusSpawnPoint = bonusSpawnPoint
      state.activeBonus = null
      state.petTotalThisLevel = petTotalThisLevel
      state.petCollectedThisLevel = 0
      state.energizedUntil = null
      state.comboIndex = 0
      state.player = resetPlayer(layout)
      state.ghosts = spawnGhosts(layout)
      state.levelUpUntil = null
      state.phase = 'playing'
    }
    return
  }

  if (state.phase !== 'playing') return

  if (state.energizedUntil !== null && now >= state.energizedUntil) {
    state.energizedUntil = null
    state.comboIndex = 0
    for (const ghost of state.ghosts) {
      if (ghost.mode === 'FRIGHTENED') ghost.mode = 'NORMAL'
    }
  }

  if (state.activeBonus && now >= state.activeBonus.expiresAt) {
    state.activeBonus = null
  }

  tickPlayer(state, layout, now, dt)
  for (const ghost of state.ghosts) tickGhost(ghost, state, layout, dt)
  if (state.phase === 'playing') resolveGhostCollisions(state, layout)
}

export type MazeGameSnapshot = {
  phase: MazePhase
  level: number
  score: number
  lives: number
  player: { row: number; col: number; facing: Direction }
  ghosts: Array<{ id: string; name: string; personality: GhostPersonality; row: number; col: number; facing: Direction; mode: GhostMode }>
  pickups: Collectible[]
  bags: Collectible[]
  bonus: ActiveBonus | null
  energizedRemainingMs: number
  comboIndex: number
  lastCollected: MazeCollectorItem | null
  totalPet: number
  collectedPet: number
}

function toSnapshot(state: InternalState, now: number): MazeGameSnapshot {
  const playerPoint = interpolated(state.player)
  return {
    phase: state.phase,
    level: state.level,
    score: state.score,
    lives: state.lives,
    player: { row: playerPoint.row, col: playerPoint.col, facing: state.player.facing },
    ghosts: state.ghosts.map((ghost) => {
      const point = interpolated(ghost)
      return {
        id: ghost.id,
        name: ghost.name,
        personality: ghost.personality,
        row: point.row,
        col: point.col,
        facing: ghost.facing,
        mode: ghost.mode,
      }
    }),
    pickups: state.pickups,
    bags: state.bags,
    bonus: state.activeBonus,
    energizedRemainingMs: state.energizedUntil !== null ? Math.max(0, state.energizedUntil - now) : 0,
    comboIndex: state.comboIndex,
    lastCollected: state.lastCollected,
    totalPet: state.petTotalThisLevel,
    collectedPet: state.petCollectedThisLevel,
  }
}

export type UseMazeCollectorGameOptions = {
  layout: MazeLayoutDef
  items: MazeCollectorItem[]
  config: MazeCollectorConfig
}

export function useMazeCollectorGame({ layout, items, config }: UseMazeCollectorGameOptions) {
  const stateRef = useRef<InternalState | undefined>(undefined)
  if (!stateRef.current) {
    stateRef.current = createInitialState(layout, items, config)
  }

  const [snapshot, setSnapshot] = useState<MazeGameSnapshot>(() => toSnapshot(stateRef.current!, performance.now()))
  const frameRef = useRef<number>(0)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    function frame(time: number) {
      frameRef.current = requestAnimationFrame(frame)
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time
        return
      }
      const dt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time
      tickEngine(stateRef.current!, layout, items, time, dt)
      setSnapshot(toSnapshot(stateRef.current!, time))
    }
    frameRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(frameRef.current)
      lastTimeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, items])

  const setDirection = useCallback((direction: Direction) => {
    primeGameFeedback()
    const state = stateRef.current!
    state.player.desiredDirection = direction
    if (state.phase === 'ready') state.phase = 'playing'
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

  return { ...snapshot, setDirection }
}
