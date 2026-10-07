import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Battery,
  BatteryFull,
  Check,
  Flame,
  LightbulbOff,
  Pause,
  Play,
  RotateCcw,
  Star,
  Timer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react'
import { GameInstructionsGate } from '../GameInstructionsGate'
import { loadSpaceshipAssets, spaceshipSpriteUrl, type SpaceshipAssets } from './spaceshipAssets'
import { SPACESHIP_MAP } from './spaceshipMap'
import { INTRO_MS, type Direction, type TfAnswerRecord } from './trueFalseMazeEngine'
import { CELL, PAD } from './TrueFalseMazeRenderer'
import { useTrueFalseMazeSession, type TrueFalseMazeHud } from './useTrueFalseMazeSession'
import type { TrueFalseMazeConfig, TrueFalseMazeQuestion } from './trueFalseMazeTypes'

export type TrueFalseMazeGameProps = {
  title: string
  questions: TrueFalseMazeQuestion[]
  config: TrueFalseMazeConfig
  onExit: () => void
}

const LOGICAL_WIDTH = SPACESHIP_MAP.cols * CELL + PAD.left + PAD.right
const LOGICAL_HEIGHT = SPACESHIP_MAP.rows * CELL + PAD.top + PAD.bottom
/** Movimiento mínimo (px) para que un toque sobre el mapa cuente como deslizar. */
const SWIPE_THRESHOLD = 18

/**
 * Laberinto Verdadero o Falso: el robot recorre la nave y responde cada
 * afirmación entrando a la sala VERDADERO o FALSO, mientras esquiva las
 * medusas galácticas. Recibe todo el contenido por props (README de juegos:
 * reproductor parametrizable) — el mapa y los sprites son del escenario.
 */
export function TrueFalseMazeGame(props: TrueFalseMazeGameProps) {
  return (
    <GameInstructionsGate kind="TRUE_FALSE_MAZE">
      <TrueFalseMazeSession {...props} />
    </GameInstructionsGate>
  )
}

/** `window.matchMedia` como estado de React (se actualiza al girar el teléfono o cambiar de pantalla). */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

function TrueFalseMazeSession({ title, questions, config, onExit }: TrueFalseMazeGameProps) {
  const [assets, setAssets] = useState<SpaceshipAssets | null>(null)
  const [loadError, setLoadError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const { hud, paused, muted, renderer, actions } = useTrueFalseMazeSession({ questions, config, assets, canvasRef })
  // Celular en horizontal: la pregunta y los controles pasan a una columna
  // lateral para que el mapa use toda la altura (si no, queda diminuto).
  const compactLandscape = useMediaQuery('(orientation: landscape) and (max-height: 520px)')
  // La cruceta en pantalla aparece en cualquier pantalla táctil, no según el ancho.
  const coarsePointer = useMediaQuery('(pointer: coarse)')

  useEffect(() => {
    let cancelled = false
    // El canvas escribe con Space Grotesk: se espera a que esté lista para que
    // los letreros no aparezcan primero con otra fuente.
    const fonts = document.fonts?.load(`700 16px 'Space Grotesk'`).catch(() => []) ?? Promise.resolve([])
    Promise.all([loadSpaceshipAssets(), fonts])
      .then(([loaded]) => {
        if (!cancelled) setAssets(loaded)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // El mapa se ajusta al espacio disponible sin deformarse.
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const update = () => {
      const scale = Math.min(stage.clientWidth / LOGICAL_WIDTH, stage.clientHeight / LOGICAL_HEIGHT)
      const width = Math.max(0, Math.floor(LOGICAL_WIDTH * scale))
      const height = Math.max(0, Math.floor(LOGICAL_HEIGHT * scale))
      setBox((current) => (current.width === width && current.height === height ? current : { width, height }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [compactLandscape])

  useEffect(() => {
    if (renderer && box.width > 0) renderer.resize(box.width, window.devicePixelRatio || 1)
  }, [renderer, box.width])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
      if (hud.phase === 'ready') actions.start()
      else if (hud.phase === 'feedback' && hud.canSkip) actions.skip()
      return
    }
    actions.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP')
  }

  const playing = hud.phase !== 'ready' && hud.phase !== 'finished'

  const exitButton = (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-slate-200 transition-colors hover:bg-white/10"
      onClick={onExit}
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
      Salir
    </button>
  )

  const controls = (
    <>
      <IconButton label={muted ? 'Activar sonido' : 'Silenciar'} onClick={actions.toggleMute}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </IconButton>
      <IconButton label={paused ? 'Reanudar' : 'Pausar'} onClick={actions.togglePause} disabled={!playing}>
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </IconButton>
    </>
  )

  const stage = (
    <div className={`relative min-h-0 min-w-0 flex-1 ${compactLandscape ? 'p-2' : 'px-2 pb-2 pt-2 sm:px-5 sm:pb-4'}`}>
      <div ref={stageRef} className="flex h-full w-full items-center justify-center">
        <div
          className="relative select-none"
          style={{ width: box.width, height: box.height, touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Mapa de la nave con el robot, las medusas y las salas Verdadero y Falso"
            className="block h-full w-full rounded-2xl bg-[#05060f] shadow-[0_0_0_1px_rgba(148,163,184,0.16),0_30px_80px_-30px_rgba(124,58,237,0.6)]"
          />
          {!assets && <LoadingOverlay error={loadError} onExit={onExit} />}
          {assets && hud.phase === 'ready' && (
            <ReadyOverlay total={hud.totalQuestions} lives={hud.maxLives} compact={compactLandscape} onStart={actions.start} />
          )}
          {hud.phase === 'intro' && hud.statement && (
            <IntroCard key={hud.questionIndex} index={hud.questionIndex} total={hud.totalQuestions} statement={hud.statement} />
          )}
          {hud.phase === 'feedback' && hud.result && <FeedbackCard hud={hud} onContinue={actions.skip} />}
          {hud.phase === 'caught' && (
            <Banner tone="danger">
              <Flame className="h-4 w-4" /> ¡Una medusa te atrapó!{' '}
              {hud.lives > 0 ? `Te ${hud.lives === 1 ? 'queda 1 vida' : `quedan ${hud.lives} vidas`}.` : ''}
            </Banner>
          )}
          {hud.lightsOut && hud.phase === 'playing' && (
            <Banner tone="alert">
              <LightbulbOff className="h-4 w-4" /> ¡Sabotaje! Luces apagadas
            </Banner>
          )}
        </div>
      </div>
    </div>
  )

  const overlays = (
    <>
      {paused && <PauseOverlay onResume={actions.resume} onExit={onExit} />}
      {hud.phase === 'finished' && <ResultsOverlay hud={hud} onRestart={actions.restart} onExit={onExit} />}
    </>
  )

  const backdrop = (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
    </div>
  )

  if (compactLandscape) {
    return (
      <div className="fixed inset-0 z-50 flex overflow-hidden bg-[#04050d] text-slate-100">
        {backdrop}
        <aside className="relative flex w-[236px] shrink-0 flex-col gap-2 overflow-y-auto py-2 pl-2">
          <div className="flex items-center gap-1.5">
            {exitButton}
            <div className="ml-auto flex gap-1.5">{controls}</div>
          </div>
          <HudBar hud={hud} className="w-full justify-between" />
          <QuestionPanel hud={hud} relocateEnabled={config.relocateSeconds > 0} compact />
          {coarsePointer && (
            <div className="mt-auto flex justify-center pb-1">
              <DirectionPad onPress={actions.move} />
            </div>
          )}
        </aside>
        {stage}
        {overlays}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#04050d] text-slate-100">
      {backdrop}

      <header className="relative flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3 sm:px-5">
        {exitButton}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">{title}</p>
          <h1 className="truncate font-heading text-[15px] font-bold tracking-tight text-white sm:text-[17px]">
            Laberinto Verdadero o Falso
          </h1>
        </div>
        <HudBar hud={hud} className="order-last w-full justify-between md:order-none md:w-auto md:justify-end" />
        {controls}
      </header>

      <QuestionPanel hud={hud} relocateEnabled={config.relocateSeconds > 0} />

      <p className="relative mx-3 mt-2 hidden rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center text-[11.5px] text-slate-300 max-sm:portrait:block">
        Gira el teléfono para ver la nave más grande.
      </p>

      {stage}

      {coarsePointer && (
        <div className="relative mx-auto mb-3">
          <DirectionPad onPress={actions.move} />
        </div>
      )}

      {overlays}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function HudBar({ hud, className = '' }: { hud: TrueFalseMazeHud; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 ${className}`}>
      <div className="flex items-center gap-1" aria-label={`Vidas: ${hud.lives} de ${hud.maxLives}`}>
        {Array.from({ length: hud.maxLives }, (_, index) =>
          index < hud.lives ? (
            <BatteryFull key={index} className="h-5 w-5 text-emerald-300" strokeWidth={2} />
          ) : (
            <Battery key={index} className="h-5 w-5 text-slate-600" strokeWidth={2} />
          ),
        )}
      </div>

      <ol className="flex max-w-[300px] flex-1 flex-wrap items-center justify-center gap-1" aria-label="Progreso de las afirmaciones">
        {Array.from({ length: hud.totalQuestions }, (_, index) => {
          const answer = hud.answers[index]
          const isCurrent = !answer && index === hud.questionIndex && hud.phase !== 'ready' && hud.phase !== 'finished'
          const tone = answer
            ? answer.correct
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            : isCurrent
              ? 'bg-white ring-2 ring-cyan-300/70 animate-pulse'
              : 'bg-slate-700'
          return <li key={index} className={`h-2 w-3.5 rounded-full ${tone}`} />
        })}
      </ol>

      <div className="flex items-center gap-2.5">
        {hud.streak >= 2 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11.5px] font-bold text-amber-300">
            <Flame className="h-3.5 w-3.5" /> x{hud.streak}
          </span>
        )}
        <div className="text-right">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">Puntos</p>
          <p className="font-heading text-[17px] font-bold leading-none text-white tabular-nums">
            {hud.score.toLocaleString('es')}
          </p>
        </div>
      </div>
    </div>
  )
}

function AnswerChip({ kind, size = 'md' }: { kind: 'TRUE' | 'FALSE'; size?: 'sm' | 'md' }) {
  const isTrue = kind === 'TRUE'
  const Icon = isTrue ? Check : X
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide ${
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]'
      } ${
        isTrue
          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
          : 'border-rose-400/50 bg-rose-500/15 text-rose-300'
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={3} />
      {isTrue ? 'Verdadero' : 'Falso'}
    </span>
  )
}

function QuestionPanel({
  hud,
  relocateEnabled,
  compact = false,
}: {
  hud: TrueFalseMazeHud
  relocateEnabled: boolean
  compact?: boolean
}) {
  let label = `Pregunta ${hud.questionIndex + 1} de ${hud.totalQuestions}`
  let statement = hud.statement ?? ''
  if (hud.phase === 'ready') {
    label = 'Misión'
    statement = `Responde ${hud.totalQuestions} afirmaciones llevando al robot a la sala correcta.`
  } else if (hud.phase === 'finished') {
    label = 'Misión terminada'
    statement = hud.won ? '¡Respondiste todas las afirmaciones!' : 'El robot se quedó sin baterías.'
  }

  const showRelocate = relocateEnabled && hud.phase === 'playing' && hud.relocateSeconds !== null

  return (
    <section
      className={`relative rounded-2xl border border-violet-400/25 bg-gradient-to-r from-violet-500/15 via-slate-900/40 to-cyan-500/10 ${
        compact ? 'px-3 py-2' : 'mx-3 mt-2 px-4 py-2.5 sm:mx-5'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-[260px]" aria-live="polite">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">{label}</p>
          <p className={`mt-0.5 font-semibold leading-snug text-white ${compact ? 'text-[14px]' : 'text-[16px] sm:text-[19px]'}`}>
            {statement}
          </p>
        </div>
        <div className={`flex shrink-0 items-center gap-2 ${compact ? 'w-full flex-wrap' : ''}`}>
          <AnswerChip kind="TRUE" />
          <AnswerChip kind="FALSE" />
        </div>
      </div>

      {(hud.empFraction > 0 || showRelocate || hud.lightsOut) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] font-medium">
          {hud.empFraction > 0 && (
            <span className="flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2.5 py-1 text-cyan-200">
              <Zap className="h-3.5 w-3.5" /> Pulso EMP: las medusas están aturdidas
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-cyan-300 transition-[width] duration-150"
                  style={{ width: `${hud.empFraction * 100}%` }}
                />
              </span>
            </span>
          )}
          {showRelocate && (
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                hud.zonesWarning
                  ? 'animate-pulse border-amber-300/60 bg-amber-400/15 text-amber-200'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              {hud.zonesWarning ? '¡Las salas van a cambiar de lugar!' : `Las salas se mueven en ${hud.relocateSeconds} s`}
            </span>
          )}
          {hud.lightsOut && (
            <span className="flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-500/15 px-2.5 py-1 text-rose-200">
              <LightbulbOff className="h-3.5 w-3.5" /> Luces apagadas: solo ves cerca del robot
            </span>
          )}
        </div>
      )}
    </section>
  )
}

function OverlayCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/15 bg-slate-950/85 p-5 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md sm:p-6 ${className}`}
    >
      {children}
    </div>
  )
}

function LoadingOverlay({ error, onExit }: { error: boolean; onExit: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <OverlayCard className="max-w-[360px]">
        {error ? (
          <>
            <p className="text-[14px] text-rose-200">No se pudieron cargar los gráficos de la nave.</p>
            <button
              type="button"
              className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-white"
              onClick={onExit}
            >
              Volver
            </button>
          </>
        ) : (
          <>
            <span className="mx-auto mb-3 block h-9 w-9 animate-spin rounded-full border-[3px] border-violet-400/30 border-t-cyan-300" />
            <p className="text-[14px] font-medium text-slate-200">Encendiendo la nave…</p>
          </>
        )}
      </OverlayCard>
    </div>
  )
}

function ReadyOverlay({
  total,
  lives,
  compact,
  onStart,
}: {
  total: number
  lives: number
  compact: boolean
  onStart: () => void
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-[#04050d]/45 p-3 sm:p-6">
      <OverlayCard className="w-full max-w-[540px] animate-[maze-levelup-pop_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex items-end justify-center gap-4">
          <img
            src={spaceshipSpriteUrl('robot/robot-down-0')}
            alt="El robot"
            className="h-16 w-auto drop-shadow-[0_0_14px_rgba(34,211,238,0.5)] sm:h-20"
          />
          <img
            src={spaceshipSpriteUrl('decor/zone-true')}
            alt="Sala Verdadero"
            className="hidden h-14 w-auto sm:block"
          />
          <img
            src={spaceshipSpriteUrl('decor/zone-false')}
            alt="Sala Falso"
            className="hidden h-14 w-auto sm:block"
          />
          <img
            src={spaceshipSpriteUrl('jellyfish/jelly-down-0')}
            alt="Una medusa galáctica"
            className="h-14 w-auto drop-shadow-[0_0_14px_rgba(192,132,252,0.6)] sm:h-16"
          />
        </div>
        <h2 className="mt-3 font-heading text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
          ¿Todo listo, tripulante?
        </h2>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-slate-300">
          Lee cada afirmación y lleva al robot a la sala <strong className="text-emerald-300">VERDADERO</strong> o{' '}
          <strong className="text-rose-300">FALSO</strong>. Son {total} afirmaciones y tienes {lives}{' '}
          {lives === 1 ? 'batería' : 'baterías'}. ¡Esquiva a las medusas galácticas!
        </p>
        <ul
          className={`mx-auto mt-3 max-w-[440px] gap-1.5 text-left text-[12px] leading-snug text-slate-300 sm:grid-cols-2 ${
            compact ? 'hidden' : 'grid'
          }`}
        >
          <li className="flex items-start gap-2 rounded-xl bg-white/5 px-2.5 py-1.5">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> Los núcleos de energía aturden a las medusas.
          </li>
          <li className="flex items-start gap-2 rounded-xl bg-white/5 px-2.5 py-1.5">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> Las rejillas te llevan al otro lado de la nave.
          </li>
        </ul>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-[15px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(34,211,238,0.7)] transition-transform hover:-translate-y-0.5"
          onClick={onStart}
        >
          <Play className="h-4 w-4" fill="currentColor" /> Despegar
        </button>
        <p className="mt-2 text-[11.5px] text-slate-400">o presiona cualquier flecha · WASD también funciona</p>
      </OverlayCard>
    </div>
  )
}

function IntroCard({ index, total, statement }: { index: number; total: number; statement: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#04050d]/35 p-3 sm:p-6">
      <OverlayCard className="w-full max-w-[600px] border-cyan-300/30 animate-[maze-levelup-pop_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Pregunta {index + 1} de {total}
        </p>
        <p className="mt-2 font-heading text-[20px] font-bold leading-snug text-white sm:text-[27px]">{statement}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <AnswerChip kind="TRUE" />
          <span className="text-[12px] text-slate-400">o</span>
          <AnswerChip kind="FALSE" />
        </div>
        <p className="mt-2 text-[12.5px] text-slate-300">Corre a la sala correcta</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-cyan-300 to-violet-400"
            style={{ animation: `tf-maze-countdown ${INTRO_MS}ms linear forwards` }}
          />
        </div>
      </OverlayCard>
    </div>
  )
}

function FeedbackCard({ hud, onContinue }: { hud: TrueFalseMazeHud; onContinue: () => void }) {
  const result = hud.result
  if (!result) return null
  const { correct, question } = result
  // La tarjeta va en la mitad opuesta a la sala elegida: así se ve la sala,
  // el confeti y (si fallaste) cuál era la correcta.
  const atTop = result.zoneCell.row >= SPACESHIP_MAP.rows / 2
  return (
    <div className={`absolute inset-x-0 flex justify-center px-2 sm:px-4 ${atTop ? 'top-2 sm:top-4' : 'bottom-2 sm:bottom-4'}`}>
      <div
        role="status"
        className={`w-full max-w-[600px] rounded-3xl border bg-slate-950/90 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md animate-[maze-levelup-pop_0.4s_cubic-bezier(0.16,1,0.3,1)] sm:p-5 ${
          correct ? 'border-emerald-400/50' : 'border-rose-400/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {correct ? <Check className="h-6 w-6" strokeWidth={3} /> : <X className="h-6 w-6" strokeWidth={3} />}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className={`font-heading text-[19px] font-bold ${correct ? 'text-emerald-300' : 'text-rose-300'}`}>
                {correct ? '¡Correcto!' : '¡Incorrecto!'}
              </p>
              <span className="text-[12px] text-slate-300">La afirmación es</span>
              <AnswerChip kind={question.answer ? 'TRUE' : 'FALSE'} size="sm" />
            </div>
            <p className="mt-1 text-[13px] italic leading-snug text-slate-300">“{question.statement}”</p>
            {question.explanation && (
              <p className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-[13px] leading-relaxed text-slate-100">
                💡 {question.explanation}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className={`text-[12.5px] font-semibold ${correct ? 'text-emerald-200' : 'text-rose-200'}`}>
                {correct ? `+${result.points.toLocaleString('es')} puntos` : `−1 batería · te ${hud.lives === 1 ? 'queda' : 'quedan'} ${hud.lives}`}
              </p>
              <button
                type="button"
                disabled={!hud.canSkip}
                className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-40"
                onClick={onContinue}
              >
                Continuar <span className="ml-1 text-slate-400">(Espacio)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Banner({ tone, children }: { tone: 'danger' | 'alert'; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
      <p
        role="status"
        className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12.5px] font-semibold shadow-lg backdrop-blur ${
          tone === 'danger'
            ? 'border-rose-400/60 bg-rose-950/80 text-rose-100'
            : 'animate-pulse border-amber-300/60 bg-amber-950/80 text-amber-100'
        }`}
      >
        {children}
      </p>
    </div>
  )
}

function PauseOverlay({ onResume, onExit }: { onResume: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#04050d]/70 p-4 backdrop-blur-sm">
      <OverlayCard className="w-full max-w-[340px]">
        <Pause className="mx-auto h-8 w-8 text-cyan-300" />
        <h2 className="mt-2 font-heading text-[22px] font-bold text-white">Pausa</h2>
        <p className="mt-1 text-[13px] text-slate-300">La nave espera por ti.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-[13.5px] font-bold text-white"
            onClick={onResume}
          >
            Reanudar
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/15 px-4 py-2 text-[13.5px] font-medium text-slate-200"
            onClick={onExit}
          >
            Salir
          </button>
        </div>
      </OverlayCard>
    </div>
  )
}

function starsFor(correct: number, total: number): number {
  const ratio = total > 0 ? correct / total : 0
  if (ratio >= 0.9) return 3
  if (ratio >= 0.6) return 2
  if (ratio >= 0.3) return 1
  return 0
}

function ResultsOverlay({ hud, onRestart, onExit }: { hud: TrueFalseMazeHud; onRestart: () => void; onExit: () => void }) {
  const correct = hud.answers.filter((answer) => answer.correct).length
  const stars = starsFor(correct, hud.totalQuestions)
  const unanswered = hud.totalQuestions - hud.answers.length

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-[#04050d]/85 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex min-h-full max-w-[680px] items-center">
        <OverlayCard className="w-full animate-[fade-in-up_0.5s_ease-out]">
          <img
            src={spaceshipSpriteUrl(hud.won ? 'robot/robot-down-0' : 'robot/robot-up-0')}
            alt=""
            className="mx-auto h-16 w-auto drop-shadow-[0_0_16px_rgba(34,211,238,0.55)]"
          />
          <h2 className="mt-2 font-heading text-[24px] font-bold tracking-tight text-white sm:text-[28px]">
            {hud.won ? '¡Misión completada!' : 'Misión fallida'}
          </h2>
          <p className="mt-1 text-[13.5px] text-slate-300">
            {hud.won ? 'El robot llegó a salvo al final del recorrido.' : 'Las medusas y los errores agotaron las baterías.'}
          </p>

          <div className="mt-3 flex justify-center gap-1.5" aria-label={`${stars} de 3 estrellas`}>
            {[0, 1, 2].map((index) => (
              <Star
                key={index}
                className={`h-8 w-8 ${index < stars ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.7)]' : 'text-slate-700'}`}
                fill="currentColor"
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <ResultStat label="Puntos" value={hud.score.toLocaleString('es')} />
            <ResultStat label="Aciertos" value={`${correct} / ${hud.totalQuestions}`} />
            <ResultStat label="Mejor racha" value={String(hud.bestStreak)} />
          </div>

          {hud.answers.length > 0 && (
            <>
              <h3 className="mt-5 text-left text-[12px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Repaso</h3>
              <ol className="mt-2 flex flex-col gap-2 text-left">
                {hud.answers.map((answer, index) => (
                  <ReviewItem key={answer.questionId} answer={answer} index={index} />
                ))}
              </ol>
            </>
          )}
          {unanswered > 0 && (
            <p className="mt-4 text-left text-[12.5px] text-slate-400">
              {unanswered === 1 ? 'Quedó 1 afirmación sin responder.' : `Quedaron ${unanswered} afirmaciones sin responder.`}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(34,211,238,0.7)]"
              onClick={onRestart}
            >
              <RotateCcw className="h-4 w-4" /> Jugar de nuevo
            </button>
            <button
              type="button"
              className="rounded-2xl border border-white/15 px-5 py-2.5 text-[14px] font-medium text-slate-200 hover:bg-white/5"
              onClick={onExit}
            >
              Salir
            </button>
          </div>
        </OverlayCard>
      </div>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2.5">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-0.5 font-heading text-[18px] font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}

function ReviewItem({ answer, index }: { answer: TfAnswerRecord; index: number }) {
  return (
    <li
      className={`rounded-2xl border px-3 py-2.5 ${
        answer.correct ? 'border-emerald-400/25 bg-emerald-500/[0.07]' : 'border-rose-400/25 bg-rose-500/[0.07]'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            answer.correct ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300'
          }`}
        >
          {answer.correct ? <Check className="h-3 w-3" strokeWidth={3.5} /> : <X className="h-3 w-3" strokeWidth={3.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-white">
            {index + 1}. {answer.statement}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate-400">
            Es <AnswerChip kind={answer.answer ? 'TRUE' : 'FALSE'} size="sm" />
            {!answer.correct && <span>· elegiste {answer.chosen ? 'Verdadero' : 'Falso'}</span>}
          </p>
          {answer.explanation && <p className="mt-1 text-[12px] leading-relaxed text-slate-300">💡 {answer.explanation}</p>}
        </div>
      </div>
    </li>
  )
}

/** Cruceta táctil (solo se muestra en pantallas táctiles; ahí también se puede deslizar sobre el mapa). */
function DirectionPad({ onPress }: { onPress: (direction: Direction) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <span />
      <PadButton direction="UP" onPress={onPress} icon={ArrowUp} label="Arriba" />
      <span />
      <PadButton direction="LEFT" onPress={onPress} icon={ArrowLeft} label="Izquierda" />
      <PadButton direction="DOWN" onPress={onPress} icon={ArrowDown} label="Abajo" />
      <PadButton direction="RIGHT" onPress={onPress} icon={ArrowRight} label="Derecha" />
    </div>
  )
}

function PadButton({
  direction,
  onPress,
  icon: Icon,
  label,
}: {
  direction: Direction
  onPress: (direction: Direction) => void
  icon: typeof ArrowUp
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 active:bg-cyan-400/20"
      onPointerDown={(event) => {
        event.preventDefault()
        onPress(direction)
      }}
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </button>
  )
}
