import { describe, expect, it } from 'vitest'
import { isOpen, manhattan, samePos } from '../mazeEngine'
import { SPACESHIP_MAP } from './spaceshipMap'
import {
  CAUGHT_MS,
  createSeededRandom,
  createTfState,
  currentQuestion,
  drainTfEvents,
  EMP_MS,
  interpolatedPosition,
  INTRO_MS,
  MIN_ZONE_DISTANCE,
  PLAYER_SPEED,
  pickZoneCells,
  POINTS,
  setTfDirection,
  shipDistanceField,
  skipTfFeedback,
  startTfGame,
  tickTf,
  VENT_TRAVEL_MS,
  ZONE_FAIRNESS_SLACK,
  type TfState,
} from './trueFalseMazeEngine'
import { DEFAULT_TRUE_FALSE_MAZE_CONFIG, type TrueFalseMazeConfig } from './trueFalseMazeTypes'
import type { CellPosition } from '../mazeCollectorTypes'

const QUESTIONS = [
  { questionId: 'q1', statement: 'El Sol es una estrella.', answer: true, explanation: 'Es una enana amarilla.' },
  { questionId: 'q2', statement: 'La Luna tiene luz propia.', answer: false },
  { questionId: 'q3', statement: 'Júpiter es el planeta más grande.', answer: true },
]

function openCells(): CellPosition[] {
  const cells: CellPosition[] = []
  SPACESHIP_MAP.grid.forEach((row, r) => row.forEach((value, c) => value === 0 && cells.push({ row: r, col: c })))
  return cells
}

function newGame(config: Partial<TrueFalseMazeConfig> = {}, seed = 7): TfState {
  return createTfState({
    map: SPACESHIP_MAP,
    questions: QUESTIONS,
    config: { ...DEFAULT_TRUE_FALSE_MAZE_CONFIG, shuffleQuestions: false, lightsOut: false, ...config },
    random: createSeededRandom(seed),
  })
}

function tickFor(state: TfState, ms: number, step = 16) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) tickTf(state, step)
}

/** Arranca la partida y deja correr la presentación de la primera pregunta. */
function startPlaying(state: TfState) {
  startTfGame(state)
  tickFor(state, INTRO_MS + 50)
  expect(state.phase).toBe('playing')
}

/** Deja correr el resultado y la presentación de la siguiente pregunta, hasta que se pueda jugar (o termine). */
function advanceToNextQuestion(state: TfState) {
  for (let i = 0; i < 2000 && state.phase !== 'playing' && state.phase !== 'finished'; i++) tickTf(state, 16)
}

/** Pone al robot en `from`, con `to` como celda vecina libre, y lo hace caminar hasta llegar. */
function walk(state: TfState, from: CellPosition, to: CellPosition) {
  const direction = to.row < from.row ? 'UP' : to.row > from.row ? 'DOWN' : to.col < from.col ? 'LEFT' : 'RIGHT'
  state.player.pos = { ...from }
  state.player.next = { ...from }
  state.player.progress = 0
  state.player.facing = direction
  setTfDirection(state, direction)
  for (let i = 0; i < 40 && state.phase === 'playing' && !samePos(state.player.pos, to); i++) tickTf(state, 16)
}

function openNeighbor(cell: CellPosition): CellPosition {
  const neighbors = [
    { row: cell.row - 1, col: cell.col },
    { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 },
    { row: cell.row, col: cell.col + 1 },
  ]
  const found = neighbors.find((n) => isOpen(SPACESHIP_MAP.grid, n.row, n.col))
  if (!found) throw new Error('celda sin vecinos libres')
  return found
}

describe('SPACESHIP_MAP', () => {
  it('conecta todas las celdas libres sin usar rejillas', () => {
    const distance = shipDistanceField(SPACESHIP_MAP, SPACESHIP_MAP.playerStart, false)
    const unreachable = openCells().filter((cell) => distance[cell.row][cell.col] < 0)
    expect(unreachable).toEqual([])
  })

  it('no tiene callejones sin salida (trampas con las medusas)', () => {
    const deadEnds = openCells().filter((cell) => {
      const exits = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ].filter(([dr, dc]) => isOpen(SPACESHIP_MAP.grid, cell.row + dr, cell.col + dc))
      return exits.length < 2
    })
    expect(deadEnds).toEqual([])
  })

  it('tiene salida del robot, nido para 4 medusas, rejillas en pareja y lugares para las salas', () => {
    expect(isOpen(SPACESHIP_MAP.grid, SPACESHIP_MAP.playerStart.row, SPACESHIP_MAP.playerStart.col)).toBe(true)
    expect(SPACESHIP_MAP.nest).toHaveLength(4)
    expect(SPACESHIP_MAP.answerSlots.length).toBeGreaterThanOrEqual(6)
    expect(SPACESHIP_MAP.powerCores).toHaveLength(4)
    expect(SPACESHIP_MAP.vents.length % 2).toBe(0)
    for (const vent of SPACESHIP_MAP.vents) {
      const back = SPACESHIP_MAP.vents.find((other) => samePos(other.pos, vent.target))
      expect(back?.target).toEqual(vent.pos)
    }
  })
})

describe('pickZoneCells', () => {
  it('elige dos salas lejos del robot y a distancias parecidas, desde cualquier celda', () => {
    for (const [index, from] of openCells().entries()) {
      const random = createSeededRandom(index + 1)
      const zones = pickZoneCells(SPACESHIP_MAP, from, [], random)
      const distance = shipDistanceField(SPACESHIP_MAP, from)
      const dTrue = distance[zones.TRUE.row][zones.TRUE.col]
      const dFalse = distance[zones.FALSE.row][zones.FALSE.col]

      expect(samePos(zones.TRUE, zones.FALSE)).toBe(false)
      expect(SPACESHIP_MAP.answerSlots).toContainEqual(zones.TRUE)
      expect(SPACESHIP_MAP.answerSlots).toContainEqual(zones.FALSE)

      const farSlots = SPACESHIP_MAP.answerSlots.filter((slot) => distance[slot.row][slot.col] >= MIN_ZONE_DISTANCE)
      if (farSlots.length >= 2) {
        expect(Math.min(dTrue, dFalse)).toBeGreaterThanOrEqual(MIN_ZONE_DISTANCE)
      }
      // La diferencia nunca supera por mucho la de la pareja más justa posible.
      let fairest = Infinity
      for (let i = 0; i < farSlots.length; i++) {
        for (let j = i + 1; j < farSlots.length; j++) {
          const a = distance[farSlots[i].row][farSlots[i].col]
          const b = distance[farSlots[j].row][farSlots[j].col]
          if (manhattan(farSlots[i], farSlots[j]) >= 6) fairest = Math.min(fairest, Math.abs(a - b))
        }
      }
      if (Number.isFinite(fairest)) expect(Math.abs(dTrue - dFalse)).toBeLessThanOrEqual(fairest + ZONE_FAIRNESS_SLACK)
    }
  })

  it('evita repetir los lugares anteriores cuando hay alternativas', () => {
    const random = createSeededRandom(3)
    const first = pickZoneCells(SPACESHIP_MAP, SPACESHIP_MAP.playerStart, [], random)
    for (let i = 0; i < 20; i++) {
      const next = pickZoneCells(SPACESHIP_MAP, SPACESHIP_MAP.playerStart, [first.TRUE, first.FALSE], random)
      expect([next.TRUE, next.FALSE]).not.toContainEqual(first.TRUE)
      expect([next.TRUE, next.FALSE]).not.toContainEqual(first.FALSE)
    }
  })
})

describe('partida', () => {
  it('espera al primer gesto, presenta la pregunta y deja jugar', () => {
    const state = newGame()
    tickFor(state, 1000)
    expect(state.phase).toBe('ready')

    setTfDirection(state, 'LEFT')
    expect(state.phase).toBe('intro')
    expect(state.zones.TRUE.pos).not.toBeNull()
    expect(state.zones.FALSE.pos).not.toBeNull()
    expect(drainTfEvents(state).map((event) => event.type)).toEqual(['zones-move', 'question'])

    tickFor(state, INTRO_MS + 50)
    expect(state.phase).toBe('playing')
  })

  it('suma puntos y avanza al acertar, y quita una vida al fallar', () => {
    const state = newGame()
    startPlaying(state)

    // Pregunta 1 es verdadera: entrar a la sala VERDADERO.
    const trueZone = state.zones.TRUE.pos!
    walk(state, openNeighbor(trueZone), trueZone)
    expect(state.phase).toBe('feedback')
    expect(state.lastResult?.correct).toBe(true)
    expect(state.score).toBeGreaterThanOrEqual(POINTS.CORRECT)
    expect(state.lives).toBe(3)

    tickFor(state, 1000)
    expect(skipTfFeedback(state)).toBe(true)
    expect(state.phase).toBe('intro')
    expect(currentQuestion(state)?.questionId).toBe('q2')

    // Pregunta 2 es falsa: entrar a VERDADERO es un error.
    tickFor(state, INTRO_MS + 50)
    const wrongZone = state.zones.TRUE.pos!
    walk(state, openNeighbor(wrongZone), wrongZone)
    expect(state.lastResult?.correct).toBe(false)
    expect(state.lives).toBe(2)
    expect(state.streak).toBe(0)
    expect(state.answers.map((answer) => answer.correct)).toEqual([true, false])
  })

  it('termina ganada al responder todas las afirmaciones', () => {
    const state = newGame()
    startPlaying(state)
    for (const question of QUESTIONS) {
      const zone = (question.answer ? state.zones.TRUE : state.zones.FALSE).pos!
      walk(state, openNeighbor(zone), zone)
      expect(state.phase).toBe('feedback')
      advanceToNextQuestion(state)
    }
    expect(state.phase).toBe('finished')
    expect(state.won).toBe(true)
    expect(state.answers.every((answer) => answer.correct)).toBe(true)
  })

  it('termina perdida cuando se acaban las vidas', () => {
    const state = newGame({ lives: 1 })
    startPlaying(state)
    const wrongZone = state.zones.FALSE.pos!
    walk(state, openNeighbor(wrongZone), wrongZone)
    expect(state.lives).toBe(0)
    tickFor(state, 10000)
    expect(state.phase).toBe('finished')
    expect(state.won).toBe(false)
  })

  it('una medusa atrapa al robot: pierde una vida y reaparece en la salida', () => {
    const state = newGame()
    startPlaying(state)
    const jelly = state.jellies[0]
    jelly.mode = 'NORMAL'
    jelly.pos = { ...state.player.pos }
    jelly.next = { ...state.player.pos }
    setTfDirection(state, 'LEFT')
    tickTf(state, 16)
    expect(state.phase).toBe('caught')
    expect(state.lives).toBe(2)

    tickFor(state, CAUGHT_MS + 50)
    expect(state.phase).toBe('playing')
    expect(state.player.pos).toEqual(SPACESHIP_MAP.playerStart)
    expect(state.jellies.every((item) => item.mode === 'WAITING')).toBe(true)
  })

  it('un núcleo de energía aturde a las medusas y permite desactivarlas', () => {
    const state = newGame()
    startPlaying(state)
    const jelly = state.jellies[0]
    jelly.mode = 'NORMAL'
    jelly.pos = { row: 2, col: 6 }
    jelly.next = { row: 3, col: 6 }

    const core = SPACESHIP_MAP.powerCores[0]
    walk(state, openNeighbor(core), core)
    expect(state.empUntil).not.toBeNull()
    expect(jelly.mode).toBe('FRIGHTENED')

    jelly.pos = { ...state.player.pos }
    jelly.next = { ...state.player.pos }
    jelly.progress = 0
    const scoreBefore = state.score
    tickTf(state, 16)
    expect(jelly.mode).toBe('RETURNING')
    expect(state.score).toBe(scoreBefore + POINTS.ZAP[0])
    expect(state.phase).toBe('playing')

    tickFor(state, EMP_MS + 100)
    expect(state.empUntil).toBeNull()
  })

  it('la rejilla de ventilación lleva al robot a su pareja', () => {
    const state = newGame()
    startPlaying(state)
    const vent = SPACESHIP_MAP.vents[0]
    walk(state, openNeighbor(vent.pos), vent.pos)
    expect(state.player.vent).not.toBeNull()
    tickFor(state, VENT_TRAVEL_MS + 50)
    expect(state.player.vent).toBeNull()
    expect(state.player.pos).toEqual(vent.target)
  })

  it('las salas cambian de lugar según relocateSeconds', () => {
    const state = newGame({ relocateSeconds: 10 })
    startPlaying(state)
    state.jellies.forEach((jelly) => (jelly.releaseAt = Infinity))
    const before = [state.zones.TRUE.pos, state.zones.FALSE.pos]
    drainTfEvents(state)
    tickFor(state, 10_100)
    const types = drainTfEvents(state).map((event) => event.type)
    expect(types).toContain('zones-warning')
    expect(types).toContain('zones-move')
    expect([state.zones.TRUE.pos, state.zones.FALSE.pos]).not.toEqual(before)
  })

  it('el robot avanza a su velocidad exacta sin importar el tamaño de cada paso', () => {
    for (const step of [7, 16, 25]) {
      const state = newGame()
      startPlaying(state)
      state.jellies.forEach((jelly) => (jelly.releaseAt = Infinity))
      // Pasillo vertical de la izquierda: de la fila 2 a la 12 sin cruces que lo frenen.
      state.player.pos = { row: 2, col: 6 }
      state.player.next = { row: 2, col: 6 }
      state.player.facing = 'DOWN'
      setTfDirection(state, 'DOWN')
      tickFor(state, 1000, step)
      const traveled = interpolatedPosition(state.player).row - 2
      expect(traveled).toBeGreaterThan(PLAYER_SPEED - 0.15)
      expect(traveled).toBeLessThan(PLAYER_SPEED + 0.15)
    }
  })

  it('come puntos de energía al caminar', () => {
    const state = newGame()
    startPlaying(state)
    const dot = SPACESHIP_MAP.dots[0]
    walk(state, openNeighbor(dot), dot)
    expect(state.dotGrid[dot.row][dot.col]).toBe(false)
    expect(state.score).toBe(POINTS.DOT)
  })
})
