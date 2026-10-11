import type { CellPosition } from '../mazeCollectorTypes'
import {
  chooseGhostDirection,
  computeGhostTarget,
  DIRECTION_DELTAS,
  isOpen,
  manhattan,
  samePos,
  type Direction,
  type GhostPersonality,
} from '../mazeEngine'
import { cellKey, type ShipMap, type ShipVent } from './spaceshipMap'
import type { TrueFalseMazeConfig, TrueFalseMazeQuestion } from './trueFalseMazeTypes'

/**
 * Motor puro (sin React ni canvas) del Laberinto Verdadero o Falso: estado
 * plano + `tickTf` que lo avanza. El hook de la partida es el único que
 * conoce `requestAnimationFrame`; el renderer y los sonidos solo leen el
 * estado y los eventos que deja cada tick. Así todo esto se prueba sin
 * montar nada (ver trueFalseMazeEngine.spec.ts).
 *
 * Dos relojes:
 * - `now`: avanza siempre que la partida no esté en pausa. Mide las fases
 *   con duración fija (presentación de la pregunta, resultado, atrapado) y
 *   anima.
 * - `worldTime`: solo avanza mientras se juega (`playing`). Mide todo lo que
 *   debe congelarse mientras se lee una pregunta o un resultado: el pulso
 *   EMP, la salida de las medusas, el cambio de lugar de las salas y los
 *   apagones.
 */

export type { Direction }

export type TfPhase = 'ready' | 'intro' | 'playing' | 'feedback' | 'caught' | 'finished'
export type ZoneKind = 'TRUE' | 'FALSE'
export type JellyMode = 'WAITING' | 'NORMAL' | 'FRIGHTENED' | 'RETURNING'

// ==================== Ajustes ====================

export const INTRO_MS = 2600
const FEEDBACK_CORRECT_MS = 2400
const FEEDBACK_WRONG_MS = 3400
const FEEDBACK_READING_MS_PER_CHAR = 30
const FEEDBACK_READING_MAX_MS = 4000
export const FEEDBACK_MIN_MS = 900
export const CAUGHT_MS = 1600
export const RESPAWN_SHIELD_MS = 2500
export const EMP_MS = 7000
export const EMP_WARNING_MS = 2000
export const ZONE_WARP_OUT_MS = 380
export const ZONE_WARP_IN_MS = 560
export const ZONE_WARNING_MS = 2500
export const LIGHTS_OUT_MS = 7000
export const VENT_TRAVEL_MS = 650
const FIRST_LIGHTS_OUT_MS: [number, number] = [28000, 42000]
const NEXT_LIGHTS_OUT_MS: [number, number] = [40000, 60000]
/** La primera medusa espera un poco: da tiempo a elegir camino después de leer la pregunta. */
const JELLY_FIRST_RELEASE_MS = 2000
const JELLY_RELEASE_GAP_MS = 2400
const JELLY_REST_AFTER_RETURN_MS = 1800

/** Celdas por segundo. El robot siempre es más rápido que las medusas en modo normal. */
export const PLAYER_SPEED = 4.6
const JELLY_BASE_SPEED = 2.5
const JELLY_SPEED_PER_CONFIG_STEP = 0.45
/** Las medusas aceleran un 3% por pregunta respondida, hasta un 30%. */
const JELLY_GROWTH_PER_QUESTION = 0.03
const JELLY_MAX_GROWTH = 0.3
const FRIGHTENED_SPEED_FACTOR = 0.55
const RETURNING_SPEED_FACTOR = 2.6
/**
 * Distancia (en celdas) a la que el robot y una medusa se consideran en
 * contacto. Los personajes se dibujan grandes (más de una celda de ancho),
 * así que el contacto tiene que sentirse justo: ni "me atravesó y no pasó
 * nada" ni "me atrapó sin tocarme".
 */
const COLLISION_RADIUS = 0.62
/** Un frame con lag (pestaña en segundo plano) nunca mueve a nadie más de este tiempo. */
const MAX_STEP_MS = 50

/** Distancia mínima (en pasos) entre el robot y una sala recién aparecida. */
export const MIN_ZONE_DISTANCE = 6
/** Distancia mínima (Manhattan) entre la sala VERDADERO y la FALSO. */
export const MIN_ZONE_SEPARATION = 6
/** Diferencia de pasos tolerada entre "ir a VERDADERO" e "ir a FALSO". */
export const ZONE_FAIRNESS_SLACK = 3

export const POINTS = {
  DOT: 10,
  CORE: 50,
  CORRECT: 500,
  TIME_BONUS_MAX: 300,
  TIME_BONUS_PER_SECOND: 10,
  STREAK_STEP: 100,
  STREAK_MAX: 400,
  SHIP_CLEAN: 1000,
  ZAP: [200, 400, 800, 1600],
} as const

/**
 * Cuatro medusas fijas, cada una con una IA distinta de mazeEngine.ts (las
 * mismas del Recolector de laberinto). `enemyCount` decide cuántas salen.
 */
export const JELLY_PROFILES: ReadonlyArray<{ name: string; personality: GhostPersonality }> = [
  { name: 'Nébula', personality: 'CHASER' },
  { name: 'Púlsar', personality: 'AMBUSHER' },
  { name: 'Cometa', personality: 'PATROLLER' },
  { name: 'Quásar', personality: 'RANDOM' },
]

const ALL_DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']
const OPPOSITE: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }

// ==================== Tipos de estado ====================

type Mover = {
  pos: CellPosition
  /** Celda hacia la que se mueve; igual a `pos` si está quieto. */
  next: CellPosition
  /** 0 = recién salió de `pos`, 1 = llegó a `next`. */
  progress: number
  facing: Direction
}

export type TfPlayer = Mover & {
  desired: Direction | null
  /** Quieto hasta que el jugador elige una dirección (al empezar cada pregunta y al reaparecer). */
  idle: boolean
  shieldUntil: number
  vent: { from: CellPosition; to: CellPosition; startedAt: number } | null
  /** Rejilla por la que acaba de salir: no vuelve a teletransportar hasta dejarla. */
  ventLock: string | null
}

export type TfJelly = Mover & {
  index: number
  name: string
  personality: GhostPersonality
  mode: JellyMode
  home: CellPosition
  pivot: CellPosition
  releaseAt: number
  /** Distancia (en pasos) de cada celda a `home`, para volver al nido sin perderse. */
  homeDistance: number[][]
}

export type TfZone = {
  kind: ZoneKind
  pos: CellPosition | null
  /** `now` desde el que la sala está en su lugar (después de su animación de salida anterior). */
  shownAt: number
  /** Lugar anterior mientras se desvanece. */
  leaving: { pos: CellPosition; at: number } | null
}

export type TfAnswerRecord = {
  questionId: string
  statement: string
  answer: boolean
  chosen: boolean
  correct: boolean
  explanation?: string
  seconds: number
  points: number
}

export type TfResult = {
  correct: boolean
  chosen: boolean
  question: TrueFalseMazeQuestion
  points: number
  zoneCell: CellPosition
}

export type TfEvent =
  | { type: 'dot'; cell: CellPosition }
  | { type: 'core'; cell: CellPosition }
  | { type: 'emp-start' }
  | { type: 'emp-ending' }
  | { type: 'emp-end' }
  | { type: 'zap'; cell: { row: number; col: number }; points: number; jellyIndex: number }
  | { type: 'answer'; correct: boolean; chosen: boolean; cell: CellPosition; points: number; streak: number }
  | { type: 'caught'; cell: { row: number; col: number } }
  | { type: 'respawn'; cell: CellPosition }
  | { type: 'vent'; from: CellPosition; to: CellPosition }
  | { type: 'vent-exit'; cell: CellPosition }
  | { type: 'zones-warning' }
  | { type: 'zones-move'; moves: Array<{ kind: ZoneKind; from: CellPosition | null; to: CellPosition }> }
  | { type: 'question'; index: number }
  | { type: 'ship-clean'; points: number }
  | { type: 'ship-refill' }
  | { type: 'lights-out' }
  | { type: 'lights-on' }
  | { type: 'jelly-release'; cell: CellPosition; jellyIndex: number }
  | { type: 'jelly-home'; cell: CellPosition; jellyIndex: number }
  | { type: 'finished'; won: boolean }

export type TfState = {
  map: ShipMap
  config: TrueFalseMazeConfig
  questions: TrueFalseMazeQuestion[]
  random: () => number
  now: number
  worldTime: number
  phase: TfPhase
  phaseUntil: number
  feedbackSkippableAt: number
  questionIndex: number
  questionStartedWorld: number
  answers: TfAnswerRecord[]
  score: number
  lives: number
  streak: number
  bestStreak: number
  player: TfPlayer
  jellies: TfJelly[]
  dotGrid: boolean[][]
  dotsLeft: number
  cores: Array<{ pos: CellPosition; taken: boolean }>
  shipCleanAwarded: boolean
  zones: Record<ZoneKind, TfZone>
  relocateAt: number | null
  relocateWarned: boolean
  empUntil: number | null
  empWarned: boolean
  combo: number
  lightsOutUntil: number | null
  nextLightsOutAt: number | null
  lastResult: TfResult | null
  caught: { cell: { row: number; col: number }; at: number } | null
  won: boolean | null
  events: TfEvent[]
}

// ==================== Utilidades de grilla ====================

function step(cell: CellPosition, direction: Direction): CellPosition {
  const delta = DIRECTION_DELTAS[direction]
  return { row: cell.row + delta.row, col: cell.col + delta.col }
}

function ventAt(map: ShipMap, cell: CellPosition): ShipVent | undefined {
  return map.vents.find((vent) => samePos(vent.pos, cell))
}

/**
 * Pasos desde `from` a cada celda (BFS; -1 = inalcanzable). Con `useVents`
 * una rejilla cuenta como un paso hacia su pareja — así es como se mueve el
 * robot; las medusas no usan rejillas.
 */
export function shipDistanceField(map: ShipMap, from: CellPosition, useVents = true): number[][] {
  const distance = map.grid.map((row) => row.map(() => -1))
  distance[from.row][from.col] = 0
  const queue: CellPosition[] = [from]
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index]
    const neighbors = ALL_DIRECTIONS.map((direction) => step(cell, direction)).filter((next) =>
      isOpen(map.grid, next.row, next.col),
    )
    if (useVents) {
      const vent = ventAt(map, cell)
      if (vent) neighbors.push(vent.target)
    }
    for (const next of neighbors) {
      if (distance[next.row][next.col] !== -1) continue
      distance[next.row][next.col] = distance[cell.row][cell.col] + 1
      queue.push(next)
    }
  }
  return distance
}

/** Generador pseudoaleatorio con semilla (mulberry32) — para pruebas reproducibles. */
export function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function randomBetween(random: () => number, [min, max]: [number, number]): number {
  return min + random() * (max - min)
}

/**
 * Elige dónde aparecen VERDADERO y FALSO. Lo importante es que la distancia
 * no delate la respuesta: entre todas las parejas de lugares posibles se
 * prefieren las que quedan a una cantidad de pasos parecida del robot (la
 * diferencia más chica, con algo de holgura para variar), lejos de él y
 * separadas entre sí. Si el mapa no da para tanto (el robot está en un
 * rincón raro), se relajan las condiciones en orden.
 */
export function pickZoneCells(
  map: ShipMap,
  from: CellPosition,
  previous: readonly CellPosition[],
  random: () => number,
): Record<ZoneKind, CellPosition> {
  const distance = shipDistanceField(map, from)
  const steps = (cell: CellPosition) => distance[cell.row][cell.col]
  const reachable = map.answerSlots.filter((slot) => steps(slot) > 0)
  const isPrevious = (cell: CellPosition) => previous.some((prev) => samePos(prev, cell))

  const levels: Array<(cell: CellPosition) => boolean> = [
    (cell) => steps(cell) >= MIN_ZONE_DISTANCE && !isPrevious(cell),
    (cell) => steps(cell) >= MIN_ZONE_DISTANCE,
    (cell) => steps(cell) >= 3,
    () => true,
  ]

  for (const accepts of levels) {
    const pool = reachable.filter(accepts)
    if (pool.length < 2) continue

    const pairs: Array<{ a: CellPosition; b: CellPosition; unfairness: number }> = []
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        pairs.push({ a: pool[i], b: pool[j], unfairness: Math.abs(steps(pool[i]) - steps(pool[j])) })
      }
    }
    const separated = pairs.filter((pair) => manhattan(pair.a, pair.b) >= MIN_ZONE_SEPARATION)
    const candidates = separated.length > 0 ? separated : pairs
    const fairest = Math.min(...candidates.map((pair) => pair.unfairness))
    const shortlist = candidates.filter((pair) => pair.unfairness <= fairest + ZONE_FAIRNESS_SLACK)
    const chosen = shortlist[Math.floor(random() * shortlist.length)]
    return random() < 0.5 ? { TRUE: chosen.a, FALSE: chosen.b } : { TRUE: chosen.b, FALSE: chosen.a }
  }

  const [a, b] = map.answerSlots
  return { TRUE: a, FALSE: b }
}

export function interpolatedPosition(mover: Mover): { row: number; col: number } {
  return {
    row: mover.pos.row + (mover.next.row - mover.pos.row) * mover.progress,
    col: mover.pos.col + (mover.next.col - mover.pos.col) * mover.progress,
  }
}

export function isMoving(mover: Mover): boolean {
  return !samePos(mover.pos, mover.next)
}

/**
 * Avanza un `speed * dt` de progreso. Si llega a `next` lo deja en la nueva
 * celda y devuelve el sobrante (fracción de celda que alcanzó a pasarse);
 * null si sigue en camino. El sobrante se aplica al tramo siguiente: si se
 * descartara, cada celda costaría un poco más de lo debido y la velocidad
 * real dependería de los FPS.
 */
function advance(mover: Mover, cellsPerSecond: number, dtMs: number): number | null {
  if (samePos(mover.pos, mover.next)) {
    mover.progress = 0
    return null
  }
  mover.progress += (cellsPerSecond * dtMs) / 1000
  if (mover.progress < 1) return null
  const leftover = Math.min(0.99, mover.progress - 1)
  mover.pos = mover.next
  mover.progress = 0
  return leftover
}

/** Aplica el sobrante de `advance` si el personaje siguió de largo hacia otra celda. */
function carry(mover: Mover, leftover: number) {
  if (leftover > 0 && isMoving(mover)) mover.progress = leftover
}

function reverse(mover: Mover) {
  if (samePos(mover.pos, mover.next)) {
    mover.facing = OPPOSITE[mover.facing]
    return
  }
  const previous = mover.pos
  mover.pos = mover.next
  mover.next = previous
  mover.progress = 1 - mover.progress
  mover.facing = OPPOSITE[mover.facing]
}

function tryStep(map: ShipMap, from: CellPosition, direction: Direction | null): CellPosition | null {
  if (!direction) return null
  const next = step(from, direction)
  return isOpen(map.grid, next.row, next.col) ? next : null
}

// ==================== Creación ====================

function freshPlayer(map: ShipMap): TfPlayer {
  return {
    pos: { ...map.playerStart },
    next: { ...map.playerStart },
    progress: 0,
    facing: 'DOWN',
    desired: null,
    idle: true,
    shieldUntil: 0,
    vent: null,
    ventLock: null,
  }
}

function createJellies(map: ShipMap, count: number): TfJelly[] {
  const total = Math.min(count, map.nest.length, JELLY_PROFILES.length)
  return Array.from({ length: total }, (_, index) => {
    const home = map.nest[index]
    const profile = JELLY_PROFILES[index]
    return {
      index,
      name: profile.name,
      personality: profile.personality,
      mode: 'WAITING' as const,
      pos: { ...home },
      next: { ...home },
      progress: 0,
      facing: 'RIGHT' as const,
      home,
      pivot: map.patrolPoints[index % map.patrolPoints.length] ?? home,
      releaseAt: 0,
      homeDistance: shipDistanceField(map, home, false),
    }
  })
}

/** Todas las medusas al nido; salen escalonadas cuando vuelve a correr el juego. */
function sendJelliesHome(state: TfState) {
  for (const jelly of state.jellies) {
    jelly.mode = 'WAITING'
    jelly.pos = { ...jelly.home }
    jelly.next = { ...jelly.home }
    jelly.progress = 0
    jelly.facing = 'RIGHT'
    jelly.releaseAt = state.worldTime + JELLY_FIRST_RELEASE_MS + jelly.index * JELLY_RELEASE_GAP_MS
  }
}

function buildDotGrid(map: ShipMap): { dotGrid: boolean[][]; dotsLeft: number } {
  const dotGrid = map.grid.map((row) => row.map(() => false))
  for (const cell of map.dots) dotGrid[cell.row][cell.col] = true
  return { dotGrid, dotsLeft: map.dots.length }
}

export type CreateTfStateOptions = {
  map: ShipMap
  questions: readonly TrueFalseMazeQuestion[]
  config: TrueFalseMazeConfig
  random?: () => number
}

export function createTfState({ map, questions, config, random = Math.random }: CreateTfStateOptions): TfState {
  const { dotGrid, dotsLeft } = buildDotGrid(map)
  const ordered = config.shuffleQuestions ? shuffled(questions, random) : [...questions]
  const state: TfState = {
    map,
    config,
    questions: ordered,
    random,
    now: 0,
    worldTime: 0,
    phase: 'ready',
    phaseUntil: 0,
    feedbackSkippableAt: 0,
    questionIndex: 0,
    questionStartedWorld: 0,
    answers: [],
    score: 0,
    lives: config.lives,
    streak: 0,
    bestStreak: 0,
    player: freshPlayer(map),
    jellies: createJellies(map, config.enemyCount),
    dotGrid,
    dotsLeft,
    cores: map.powerCores.map((pos) => ({ pos, taken: false })),
    shipCleanAwarded: false,
    zones: {
      TRUE: { kind: 'TRUE', pos: null, shownAt: 0, leaving: null },
      FALSE: { kind: 'FALSE', pos: null, shownAt: 0, leaving: null },
    },
    relocateAt: null,
    relocateWarned: false,
    empUntil: null,
    empWarned: false,
    combo: 0,
    lightsOutUntil: null,
    nextLightsOutAt: config.lightsOut ? randomBetween(random, FIRST_LIGHTS_OUT_MS) : null,
    lastResult: null,
    caught: null,
    won: null,
    events: [],
  }
  sendJelliesHome(state)
  return state
}

// ==================== Acciones del jugador ====================

/** Primer gesto del jugador: arranca la primera pregunta. */
export function startTfGame(state: TfState) {
  if (state.phase !== 'ready') return
  beginQuestion(state)
}

export function setTfDirection(state: TfState, direction: Direction) {
  if (state.phase === 'finished' || state.phase === 'caught') return
  if (state.phase === 'ready') startTfGame(state)

  const player = state.player
  player.desired = direction
  player.idle = false

  // Reversa inmediata a mitad de camino (como en el arcade clásico): esperar
  // a llegar a la celda para dar la vuelta se siente lento al huir.
  if (state.phase === 'playing' && !player.vent && isMoving(player) && direction === OPPOSITE[player.facing]) {
    reverse(player)
  }
}

/** Saltar el resultado de una respuesta (Espacio/Enter/botón). Solo después de un mínimo, para no saltarlo sin querer. */
export function skipTfFeedback(state: TfState): boolean {
  if (state.phase !== 'feedback' || state.now < state.feedbackSkippableAt) return false
  endFeedback(state)
  return true
}

export function drainTfEvents(state: TfState): TfEvent[] {
  const events = state.events
  state.events = []
  return events
}

// ==================== Flujo de preguntas ====================

export function currentQuestion(state: TfState): TrueFalseMazeQuestion | null {
  return state.questions[state.questionIndex] ?? null
}

function moveZones(state: TfState) {
  const previous = [state.zones.TRUE.pos, state.zones.FALSE.pos].filter((cell): cell is CellPosition => cell !== null)
  const cells = pickZoneCells(state.map, state.player.pos, previous, state.random)
  const moves: Array<{ kind: ZoneKind; from: CellPosition | null; to: CellPosition }> = []
  for (const kind of ['TRUE', 'FALSE'] as const) {
    const zone = state.zones[kind]
    zone.leaving = zone.pos ? { pos: zone.pos, at: state.now } : null
    moves.push({ kind, from: zone.pos, to: cells[kind] })
    zone.pos = cells[kind]
    zone.shownAt = state.now + (zone.leaving ? ZONE_WARP_OUT_MS : 0)
  }
  state.relocateAt = state.config.relocateSeconds > 0 ? state.worldTime + state.config.relocateSeconds * 1000 : null
  state.relocateWarned = false
  state.events.push({ type: 'zones-move', moves })
}

function beginQuestion(state: TfState) {
  state.phase = 'intro'
  state.phaseUntil = state.now + INTRO_MS
  state.lastResult = null
  state.player.idle = true
  state.player.desired = null
  state.player.next = { ...state.player.pos }
  state.player.progress = 0
  state.empUntil = null
  state.combo = 0
  sendJelliesHome(state)

  if (state.dotsLeft === 0) {
    const { dotGrid, dotsLeft } = buildDotGrid(state.map)
    state.dotGrid = dotGrid
    state.dotsLeft = dotsLeft
    for (const core of state.cores) core.taken = false
    state.shipCleanAwarded = false
    state.events.push({ type: 'ship-refill' })
  }

  moveZones(state)
  state.events.push({ type: 'question', index: state.questionIndex })
}

export function feedbackDurationMs(correct: boolean, explanation: string | undefined): number {
  const reading = Math.min(FEEDBACK_READING_MAX_MS, (explanation?.length ?? 0) * FEEDBACK_READING_MS_PER_CHAR)
  return (correct ? FEEDBACK_CORRECT_MS : FEEDBACK_WRONG_MS) + reading
}

function answerQuestion(state: TfState, chosen: boolean, zoneCell: CellPosition) {
  const question = currentQuestion(state)
  if (!question) return
  const correct = chosen === question.answer
  const seconds = Math.max(0, (state.worldTime - state.questionStartedWorld) / 1000)

  let points = 0
  if (correct) {
    state.streak += 1
    state.bestStreak = Math.max(state.bestStreak, state.streak)
    const timeBonus = Math.max(0, Math.round(POINTS.TIME_BONUS_MAX - seconds * POINTS.TIME_BONUS_PER_SECOND))
    const streakBonus = Math.min(POINTS.STREAK_MAX, POINTS.STREAK_STEP * (state.streak - 1))
    points = POINTS.CORRECT + timeBonus + streakBonus
    state.score += points
  } else {
    state.streak = 0
    state.lives -= 1
  }

  state.answers.push({
    questionId: question.questionId,
    statement: question.statement,
    answer: question.answer,
    chosen,
    correct,
    explanation: question.explanation,
    seconds: Math.round(seconds * 10) / 10,
    points,
  })
  state.lastResult = { correct, chosen, question, points, zoneCell }
  // Responder vuelve a encender las luces: el resultado y su explicación se tienen que ver.
  if (state.lightsOutUntil !== null) {
    state.lightsOutUntil = null
    state.nextLightsOutAt = state.worldTime + randomBetween(state.random, NEXT_LIGHTS_OUT_MS)
  }
  state.phase = 'feedback'
  state.phaseUntil = state.now + feedbackDurationMs(correct, question.explanation)
  state.feedbackSkippableAt = state.now + FEEDBACK_MIN_MS
  state.player.next = { ...state.player.pos }
  state.player.progress = 0
  state.events.push({ type: 'answer', correct, chosen, cell: zoneCell, points, streak: state.streak })
}

function endFeedback(state: TfState) {
  if (state.lives <= 0) {
    finish(state, false)
    return
  }
  state.questionIndex += 1
  if (state.questionIndex >= state.questions.length) {
    finish(state, true)
    return
  }
  beginQuestion(state)
}

function finish(state: TfState, won: boolean) {
  state.phase = 'finished'
  state.won = won
  state.lightsOutUntil = null
  state.events.push({ type: 'finished', won })
}

// ==================== Tick ====================

export function tickTf(state: TfState, dtMsRaw: number) {
  const dtMs = Math.min(Math.max(0, dtMsRaw), MAX_STEP_MS)
  state.now += dtMs

  switch (state.phase) {
    case 'intro':
      if (state.now >= state.phaseUntil) {
        state.phase = 'playing'
        state.questionStartedWorld = state.worldTime
      }
      return
    case 'feedback':
      if (state.now >= state.phaseUntil) endFeedback(state)
      return
    case 'caught':
      if (state.now >= state.phaseUntil) afterCaught(state)
      return
    case 'playing':
      state.worldTime += dtMs
      tickWorld(state, dtMs)
      return
    default:
      return
  }
}

function tickWorld(state: TfState, dtMs: number) {
  tickTimers(state)
  tickPlayer(state, dtMs)
  if (state.phase !== 'playing') return
  for (const jelly of state.jellies) tickJelly(state, jelly, dtMs)
  resolveCollisions(state)
}

function tickTimers(state: TfState) {
  const world = state.worldTime

  if (state.empUntil !== null) {
    if (!state.empWarned && world >= state.empUntil - EMP_WARNING_MS) {
      state.empWarned = true
      state.events.push({ type: 'emp-ending' })
    }
    if (world >= state.empUntil) {
      state.empUntil = null
      state.combo = 0
      for (const jelly of state.jellies) if (jelly.mode === 'FRIGHTENED') jelly.mode = 'NORMAL'
      state.events.push({ type: 'emp-end' })
    }
  }

  if (state.relocateAt !== null) {
    if (!state.relocateWarned && world >= state.relocateAt - ZONE_WARNING_MS) {
      state.relocateWarned = true
      state.events.push({ type: 'zones-warning' })
    }
    if (world >= state.relocateAt) moveZones(state)
  }

  if (state.config.lightsOut) {
    if (state.lightsOutUntil !== null && world >= state.lightsOutUntil) {
      state.lightsOutUntil = null
      state.nextLightsOutAt = world + randomBetween(state.random, NEXT_LIGHTS_OUT_MS)
      state.events.push({ type: 'lights-on' })
    } else if (state.lightsOutUntil === null && state.nextLightsOutAt !== null && world >= state.nextLightsOutAt) {
      state.lightsOutUntil = world + LIGHTS_OUT_MS
      state.events.push({ type: 'lights-out' })
    }
  }

  for (const jelly of state.jellies) {
    if (jelly.mode === 'WAITING' && world >= jelly.releaseAt) {
      // Si el pulso EMP sigue activo, sale aturdida como las demás.
      jelly.mode = state.empUntil !== null ? 'FRIGHTENED' : 'NORMAL'
      state.events.push({ type: 'jelly-release', cell: jelly.pos, jellyIndex: jelly.index })
    }
  }
}

function tickPlayer(state: TfState, dtMs: number) {
  const player = state.player
  if (player.vent) {
    if (state.worldTime - player.vent.startedAt >= VENT_TRAVEL_MS) finishVent(state)
    return
  }
  if (player.idle) return

  const leftover = advance(player, PLAYER_SPEED, dtMs)
  const arrived = leftover !== null
  if (arrived || !isMoving(player)) {
    const viaDesired = tryStep(state.map, player.pos, player.desired)
    if (viaDesired && player.desired) {
      player.facing = player.desired
      player.next = viaDesired
    } else {
      player.next = tryStep(state.map, player.pos, player.facing) ?? player.pos
    }
  }
  if (arrived) {
    onPlayerArrive(state)
    if (state.phase === 'playing' && !player.vent) carry(player, leftover)
  }
}

function zoneReadyAt(state: TfState, cell: CellPosition): TfZone | null {
  for (const kind of ['TRUE', 'FALSE'] as const) {
    const zone = state.zones[kind]
    // Se puede entrar un poco antes de que termine de materializarse: si el
    // robot ya está encima, esperar se siente como un bug.
    if (zone.pos && samePos(zone.pos, cell) && state.now >= zone.shownAt + ZONE_WARP_IN_MS * 0.5) return zone
  }
  return null
}

function onPlayerArrive(state: TfState) {
  const player = state.player
  const cell = player.pos
  const key = cellKey(cell)
  if (player.ventLock && player.ventLock !== key) player.ventLock = null

  if (state.dotGrid[cell.row][cell.col]) {
    state.dotGrid[cell.row][cell.col] = false
    state.dotsLeft -= 1
    state.score += POINTS.DOT
    state.events.push({ type: 'dot', cell })
  }

  const core = state.cores.find((item) => !item.taken && samePos(item.pos, cell))
  if (core) {
    core.taken = true
    state.score += POINTS.CORE
    state.events.push({ type: 'core', cell })
    startEmp(state)
  }

  if (!state.shipCleanAwarded && state.dotsLeft === 0) {
    state.shipCleanAwarded = true
    state.score += POINTS.SHIP_CLEAN
    state.events.push({ type: 'ship-clean', points: POINTS.SHIP_CLEAN })
  }

  const zone = zoneReadyAt(state, cell)
  if (zone) {
    answerQuestion(state, zone.kind === 'TRUE', cell)
    return
  }

  const vent = ventAt(state.map, cell)
  if (vent && player.ventLock !== key) startVent(state, vent)
}

function startEmp(state: TfState) {
  state.empUntil = state.worldTime + EMP_MS
  state.empWarned = false
  state.combo = 0
  for (const jelly of state.jellies) {
    if (jelly.mode !== 'NORMAL') continue
    jelly.mode = 'FRIGHTENED'
    reverse(jelly)
  }
  state.events.push({ type: 'emp-start' })
}

function startVent(state: TfState, vent: ShipVent) {
  const player = state.player
  player.vent = { from: vent.pos, to: vent.target, startedAt: state.worldTime }
  player.next = { ...player.pos }
  player.progress = 0
  state.events.push({ type: 'vent', from: vent.pos, to: vent.target })
}

function finishVent(state: TfState) {
  const player = state.player
  if (!player.vent) return
  const destination = player.vent.to
  player.pos = { ...destination }
  player.next = { ...destination }
  player.progress = 0
  player.vent = null
  player.ventLock = cellKey(destination)
  player.shieldUntil = Math.max(player.shieldUntil, state.worldTime + 400)
  state.events.push({ type: 'vent-exit', cell: destination })
}

export function tfJellySpeed(state: TfState): number {
  const base = JELLY_BASE_SPEED + (state.config.enemySpeed - 1) * JELLY_SPEED_PER_CONFIG_STEP
  const growth = Math.min(JELLY_MAX_GROWTH, state.questionIndex * JELLY_GROWTH_PER_QUESTION)
  return base * (1 + growth)
}

function chooseJellyDirection(state: TfState, jelly: TfJelly): Direction {
  if (jelly.mode === 'RETURNING') {
    let best: Direction = jelly.facing
    let bestDistance = Infinity
    for (const direction of ALL_DIRECTIONS) {
      const next = step(jelly.pos, direction)
      if (!isOpen(state.map.grid, next.row, next.col)) continue
      const distance = jelly.homeDistance[next.row][next.col]
      if (distance >= 0 && distance < bestDistance) {
        bestDistance = distance
        best = direction
      }
    }
    return best
  }

  const target = computeGhostTarget(
    jelly.personality,
    state.map.grid,
    { pos: jelly.pos, pivot: jelly.pivot },
    { pos: state.player.pos, facing: state.player.facing },
  )
  return chooseGhostDirection(
    state.map.grid,
    jelly.pos,
    jelly.facing,
    target,
    jelly.personality,
    jelly.mode === 'FRIGHTENED',
    state.random,
  )
}

function tickJelly(state: TfState, jelly: TfJelly, dtMs: number) {
  if (jelly.mode === 'WAITING') return

  const factor =
    jelly.mode === 'FRIGHTENED' ? FRIGHTENED_SPEED_FACTOR : jelly.mode === 'RETURNING' ? RETURNING_SPEED_FACTOR : 1
  const leftover = advance(jelly, tfJellySpeed(state) * factor, dtMs)
  if (leftover === null && isMoving(jelly)) return

  if (jelly.mode === 'RETURNING' && samePos(jelly.pos, jelly.home)) {
    jelly.mode = 'WAITING'
    jelly.releaseAt = state.worldTime + JELLY_REST_AFTER_RETURN_MS
    jelly.next = { ...jelly.pos }
    state.events.push({ type: 'jelly-home', cell: jelly.home, jellyIndex: jelly.index })
    return
  }

  const direction = chooseJellyDirection(state, jelly)
  const next = step(jelly.pos, direction)
  jelly.facing = direction
  jelly.next = isOpen(state.map.grid, next.row, next.col) ? next : { ...jelly.pos }
  if (leftover !== null) carry(jelly, leftover)
}

function resolveCollisions(state: TfState) {
  const player = state.player
  if (player.vent || state.worldTime < player.shieldUntil) return
  const playerPoint = interpolatedPosition(player)

  for (const jelly of state.jellies) {
    if (jelly.mode === 'RETURNING') continue
    // Durante el pulso EMP las que esperan en el nido también están aturdidas: no hacen daño.
    if (jelly.mode === 'WAITING' && state.empUntil !== null) continue
    const jellyPoint = interpolatedPosition(jelly)
    const distance = Math.hypot(playerPoint.row - jellyPoint.row, playerPoint.col - jellyPoint.col)
    if (distance > COLLISION_RADIUS) continue

    if (jelly.mode === 'FRIGHTENED') {
      const points = POINTS.ZAP[Math.min(state.combo, POINTS.ZAP.length - 1)]
      state.combo += 1
      state.score += points
      jelly.mode = 'RETURNING'
      state.events.push({ type: 'zap', cell: jellyPoint, points, jellyIndex: jelly.index })
      continue
    }

    catchPlayer(state, playerPoint)
    return
  }
}

function catchPlayer(state: TfState, cell: { row: number; col: number }) {
  state.lives -= 1
  state.phase = 'caught'
  state.phaseUntil = state.now + CAUGHT_MS
  state.caught = { cell, at: state.now }
  state.lightsOutUntil = null
  state.events.push({ type: 'caught', cell })
}

function afterCaught(state: TfState) {
  state.caught = null
  if (state.lives <= 0) {
    finish(state, false)
    return
  }
  state.player = freshPlayer(state.map)
  state.player.shieldUntil = state.worldTime + RESPAWN_SHIELD_MS
  state.empUntil = null
  state.combo = 0
  sendJelliesHome(state)
  if (state.config.relocateSeconds > 0) {
    state.relocateAt = state.worldTime + state.config.relocateSeconds * 1000
    state.relocateWarned = false
  }
  if (state.config.lightsOut) state.nextLightsOutAt = state.worldTime + randomBetween(state.random, NEXT_LIGHTS_OUT_MS)
  state.phase = 'playing'
  state.events.push({ type: 'respawn', cell: state.player.pos })
}
