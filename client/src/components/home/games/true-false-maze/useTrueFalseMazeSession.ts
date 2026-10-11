import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { SpaceshipAssets } from './spaceshipAssets'
import { SPACESHIP_MAP } from './spaceshipMap'
import {
  createTfState,
  currentQuestion,
  drainTfEvents,
  EMP_MS,
  setTfDirection,
  skipTfFeedback,
  startTfGame,
  tickTf,
  ZONE_WARNING_MS,
  type Direction,
  type TfAnswerRecord,
  type TfPhase,
  type TfResult,
  type TfState,
} from './trueFalseMazeEngine'
import { TrueFalseMazeRenderer } from './TrueFalseMazeRenderer'
import { readMutedPreference, TrueFalseMazeSfx } from './trueFalseMazeSfx'
import type { TrueFalseMazeConfig, TrueFalseMazeQuestion } from './trueFalseMazeTypes'

/** Lo que React necesita para pintar el HUD y los mensajes; cambia pocas veces por segundo, no en cada frame. */
export type TrueFalseMazeHud = {
  phase: TfPhase
  questionIndex: number
  totalQuestions: number
  statement: string | null
  score: number
  lives: number
  maxLives: number
  streak: number
  bestStreak: number
  answers: TfAnswerRecord[]
  /** 0 a 1, lo que queda del pulso EMP (redondeado a pasos de 5%). */
  empFraction: number
  /** Segundos que le quedan al pulso EMP; null si no hay pulso. */
  empSeconds: number | null
  /** Segundos hasta que las salas cambien de lugar; null si no aplica ahora. */
  relocateSeconds: number | null
  zonesWarning: boolean
  lightsOut: boolean
  result: TfResult | null
  canSkip: boolean
  won: boolean | null
}

function snapshot(state: TfState): TrueFalseMazeHud {
  const empRemaining = state.empUntil !== null ? Math.max(0, state.empUntil - state.worldTime) : 0
  const relocateRemaining =
    state.relocateAt !== null && state.phase === 'playing' ? Math.max(0, state.relocateAt - state.worldTime) : null
  return {
    phase: state.phase,
    questionIndex: state.questionIndex,
    totalQuestions: state.questions.length,
    statement: currentQuestion(state)?.statement ?? null,
    score: state.score,
    lives: state.lives,
    maxLives: state.config.lives,
    streak: state.streak,
    bestStreak: state.bestStreak,
    answers: state.answers.slice(),
    empFraction: Math.round((empRemaining / EMP_MS) * 20) / 20,
    empSeconds: state.empUntil !== null ? Math.ceil(empRemaining / 1000) : null,
    relocateSeconds: relocateRemaining === null ? null : Math.ceil(relocateRemaining / 1000),
    zonesWarning: relocateRemaining !== null && relocateRemaining < ZONE_WARNING_MS,
    lightsOut: state.lightsOutUntil !== null && state.phase === 'playing',
    result: state.lastResult,
    canSkip: state.phase === 'feedback' && state.now >= state.feedbackSkippableAt,
    won: state.won,
  }
}

function hudKey(hud: TrueFalseMazeHud): string {
  return [
    hud.phase,
    hud.questionIndex,
    hud.score,
    hud.lives,
    hud.streak,
    hud.answers.length,
    hud.empFraction,
    hud.empSeconds,
    hud.relocateSeconds,
    hud.zonesWarning,
    hud.lightsOut,
    hud.canSkip,
    hud.won,
    hud.result ? `${hud.result.question.questionId}:${hud.result.correct}` : '',
  ].join('|')
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
  W: 'UP',
  S: 'DOWN',
  A: 'LEFT',
  D: 'RIGHT',
}

type Options = {
  questions: TrueFalseMazeQuestion[]
  config: TrueFalseMazeConfig
  assets: SpaceshipAssets | null
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** false mientras hay otra pantalla encima (la guía): el teclado y los toques no mueven al robot. */
  inputEnabled?: boolean
  /**
   * Se llama justo antes de que arranque la partida, dentro del mismo gesto del
   * jugador (clic, tecla o toque). Es el único momento en que el navegador deja
   * pedir la pantalla completa sin que el jugador lo haga a mano.
   */
  onBeforeStart?: () => void
}

/**
 * Corre la partida: crea el estado del motor, el renderer y los sonidos, y
 * mueve el loop con requestAnimationFrame. El HUD de React solo se
 * actualiza cuando cambia algo visible (puntos, vidas, fase...).
 */
export function useTrueFalseMazeSession({ questions, config, assets, canvasRef, inputEnabled = true, onBeforeStart }: Options) {
  const [initialState] = useState(() => createTfState({ map: SPACESHIP_MAP, questions, config }))
  const [sfx] = useState(() => new TrueFalseMazeSfx(readMutedPreference()))
  const stateRef = useRef<TfState>(initialState)
  const rendererRef = useRef<TrueFalseMazeRenderer | null>(null)
  const pausedRef = useRef(false)
  const hudKeyRef = useRef('')
  const inputEnabledRef = useRef(inputEnabled)
  useEffect(() => {
    inputEnabledRef.current = inputEnabled
  }, [inputEnabled])
  const onBeforeStartRef = useRef(onBeforeStart)
  useEffect(() => {
    onBeforeStartRef.current = onBeforeStart
  }, [onBeforeStart])

  const [renderer, setRenderer] = useState<TrueFalseMazeRenderer | null>(null)
  const [hud, setHud] = useState<TrueFalseMazeHud>(() => snapshot(initialState))
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(() => readMutedPreference())

  const publish = useCallback(() => {
    const next = snapshot(stateRef.current)
    const key = hudKey(next)
    if (key === hudKeyRef.current) return
    hudKeyRef.current = key
    setHud(next)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!assets || !canvas) return
    const created = new TrueFalseMazeRenderer(canvas, assets, SPACESHIP_MAP)
    rendererRef.current = created
    setRenderer(created)
    return () => {
      rendererRef.current = null
      setRenderer(null)
    }
  }, [assets, canvasRef])

  useEffect(() => () => sfx.dispose(), [sfx])

  useEffect(() => {
    if (!assets) return
    let frame = 0
    let last: number | null = null
    const loop = (time: number) => {
      frame = requestAnimationFrame(loop)
      const dt = last === null ? 16 : time - last
      last = time
      if (pausedRef.current) return
      const state = stateRef.current
      // Sub-pasos de 25 ms: aunque el navegador dibuje lento (equipos sin
      // aceleración gráfica), el juego avanza a velocidad real y nadie
      // "atraviesa" a una medusa entre un frame y otro. Más de 150 ms es un
      // tirón (pestaña en pausa, etc.) y no se recupera.
      let remaining = Math.min(dt, 150)
      while (remaining > 0) {
        const step = Math.min(remaining, 25)
        tickTf(state, step)
        remaining -= step
      }
      const events = drainTfEvents(state)
      const current = rendererRef.current
      // Solo en desarrollo (se elimina del build): deja el estado a mano para las pruebas en navegador.
      if (import.meta.env.DEV) (window as unknown as { __tfMaze?: unknown }).__tfMaze = { state, renderer: current }
      if (events.length > 0) {
        current?.consume(events, state)
        sfx.play(events)
      }
      current?.draw(state, dt)
      publish()
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [assets, publish, sfx])

  const setPausedBoth = useCallback(
    (value: boolean) => {
      const phase = stateRef.current.phase
      if (value && (phase === 'finished' || phase === 'ready')) return
      pausedRef.current = value
      setPaused(value)
      publish()
    },
    [publish],
  )

  const move = useCallback(
    (direction: Direction) => {
      if (pausedRef.current || !inputEnabledRef.current) return
      sfx.prime()
      // Mover la primera vez también despega: es el mismo gesto que "Despegar".
      if (stateRef.current.phase === 'ready') onBeforeStartRef.current?.()
      setTfDirection(stateRef.current, direction)
    },
    [sfx],
  )

  const start = useCallback(() => {
    if (!inputEnabledRef.current) return
    sfx.prime()
    if (stateRef.current.phase === 'ready') onBeforeStartRef.current?.()
    startTfGame(stateRef.current)
  }, [sfx])

  const skip = useCallback(() => {
    if (!inputEnabledRef.current) return
    skipTfFeedback(stateRef.current)
  }, [])

  /** Vuelve a dibujar el último estado (si cambió el tamaño mientras el juego estaba en pausa, el canvas queda en blanco). */
  const redraw = useCallback(() => {
    rendererRef.current?.draw(stateRef.current, 0)
  }, [])

  const togglePause = useCallback(() => setPausedBoth(!pausedRef.current), [setPausedBoth])
  const pause = useCallback(() => setPausedBoth(true), [setPausedBoth])
  const resume = useCallback(() => setPausedBoth(false), [setPausedBoth])

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current
      sfx.setMuted(next)
      if (!next) sfx.prime()
      return next
    })
  }, [sfx])

  const restart = useCallback(() => {
    stateRef.current = createTfState({ map: SPACESHIP_MAP, questions, config })
    rendererRef.current?.reset()
    pausedRef.current = false
    setPaused(false)
    hudKeyRef.current = ''
    publish()
  }, [questions, config, publish])

  // Teclado: flechas/WASD mueven; Espacio/Enter empieza, salta el resultado o reanuda; P/Esc pausa; M silencia.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!inputEnabledRef.current) return
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
      const state = stateRef.current
      const direction = KEY_TO_DIRECTION[event.key]
      if (direction) {
        event.preventDefault()
        move(direction)
        return
      }
      if (event.key === ' ' || event.key === 'Enter') {
        if (event.target instanceof HTMLButtonElement) return
        event.preventDefault()
        if (pausedRef.current) setPausedBoth(false)
        else if (state.phase === 'ready') start()
        else if (state.phase === 'feedback') skip()
        return
      }
      if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        event.preventDefault()
        togglePause()
        return
      }
      if (event.key === 'm' || event.key === 'M') toggleMute()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [move, start, skip, togglePause, toggleMute, setPausedBoth])

  // Si la pestaña queda en segundo plano, la partida se pausa sola.
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) setPausedBoth(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [setPausedBoth])

  return {
    hud,
    paused,
    muted,
    renderer,
    actions: {
      move,
      start,
      skip,
      togglePause,
      toggleMute,
      restart,
      redraw,
      pause,
      resume,
    },
  }
}
