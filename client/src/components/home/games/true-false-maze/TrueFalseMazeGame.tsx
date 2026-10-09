import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Battery,
  BatteryFull,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  LightbulbOff,
  LogOut,
  Maximize,
  Minimize,
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
import { FitScale } from './FitScale'
import { loadSpaceshipAssets, spaceshipSpriteUrl, type SpaceshipAssets } from './spaceshipAssets'
import { SPACESHIP_MAP } from './spaceshipMap'
import { INTRO_MS, type Direction, type TfAnswerRecord } from './trueFalseMazeEngine'
import type { Insets } from './TrueFalseMazeRenderer'
import { TrueFalseMazeGuide } from './TrueFalseMazeGuide'
import { useTrueFalseMazeSession, type TrueFalseMazeHud } from './useTrueFalseMazeSession'
import type { TrueFalseMazeConfig, TrueFalseMazeQuestion } from './trueFalseMazeTypes'

export type TrueFalseMazeGameProps = {
  title: string
  questions: TrueFalseMazeQuestion[]
  config: TrueFalseMazeConfig
  onExit: () => void
}

/** Movimiento mínimo (px) para que un toque sobre el mapa cuente como deslizar. */
const SWIPE_THRESHOLD = 18
/** Aire entre los paneles y la nave. */
const EDGE_GAP = 8
/** Cuánto se ve el aviso "pausa aquí" al despegar. */
const PAUSE_HINT_MS = 6000

/**
 * Laberinto Verdadero o Falso: el robot recorre la nave y responde cada
 * afirmación entrando a la sala VERDADERO o FALSO, mientras esquiva las
 * medusas galácticas. Recibe todo el contenido por props (README de juegos:
 * reproductor parametrizable) — el mapa y los sprites son del escenario.
 *
 * La pantalla es el juego: el canvas cubre todo y los paneles (HUD, pregunta,
 * cruceta) flotan encima. Antes de jugar se muestra una guía visual de 5
 * pasos; se puede volver a abrir desde el botón de ayuda.
 */
export function TrueFalseMazeGame(props: TrueFalseMazeGameProps) {
  const [guideOpen, setGuideOpen] = useState(true)
  return (
    <>
      <TrueFalseMazeSession {...props} guideOpen={guideOpen} onOpenGuide={() => setGuideOpen(true)} />
      {guideOpen && <TrueFalseMazeGuide onClose={() => setGuideOpen(false)} />}
    </>
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

type Layout = { width: number; height: number; insets: Insets }

function sameLayout(a: Layout, b: Layout): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.insets.top === b.insets.top &&
    a.insets.right === b.insets.right &&
    a.insets.bottom === b.insets.bottom &&
    a.insets.left === b.insets.left
  )
}

function TrueFalseMazeSession({
  title,
  questions,
  config,
  onExit,
  guideOpen,
  onOpenGuide,
}: TrueFalseMazeGameProps & { guideOpen: boolean; onOpenGuide: () => void }) {
  const [assets, setAssets] = useState<SpaceshipAssets | null>(null)
  const [loadError, setLoadError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const bottomPadRef = useRef<HTMLDivElement>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const [layout, setLayout] = useState<Layout>({ width: 0, height: 0, insets: { top: 0, right: 0, bottom: 0, left: 0 } })
  const [fullscreen, setFullscreen] = useState(false)
  const { hud, paused, muted, renderer, actions } = useTrueFalseMazeSession({
    questions,
    config,
    assets,
    canvasRef,
    inputEnabled: !guideOpen,
  })
  // Celular en horizontal: el HUD pasa a una columna lateral para que la nave use toda la altura.
  const compactLandscape = useMediaQuery('(orientation: landscape) and (max-height: 520px)')
  // La cruceta aparece en cualquier pantalla táctil, no según el ancho.
  const coarsePointer = useMediaQuery('(pointer: coarse)')
  const portraitPhone = useMediaQuery('(orientation: portrait) and (max-width: 600px)')
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled

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

  // Abrir la guía a mitad de partida pausa el juego.
  const { pause } = actions
  useEffect(() => {
    if (guideOpen) pause()
  }, [guideOpen, pause])

  // La nave se centra en el espacio que dejan libre los paneles: se miden y se le pasan al renderer.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const rootRect = root.getBoundingClientRect()
      const hudRect = hudRef.current?.getBoundingClientRect()
      const asideRect = asideRef.current?.getBoundingClientRect()
      const padRect = bottomPadRef.current?.getBoundingClientRect()
      const next: Layout = {
        width: Math.round(rootRect.width),
        height: Math.round(rootRect.height),
        insets: {
          top: Math.round(hudRect ? hudRect.bottom - rootRect.top + EDGE_GAP : EDGE_GAP),
          right: EDGE_GAP,
          bottom: Math.round(padRect ? rootRect.bottom - padRect.top + EDGE_GAP : EDGE_GAP),
          left: Math.round(asideRect ? asideRect.right - rootRect.left + EDGE_GAP : EDGE_GAP),
        },
      }
      setLayout((current) => (sameLayout(current, next) ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const element of [root, hudRef.current, asideRef.current, bottomPadRef.current]) {
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [compactLandscape, coarsePointer])

  const { redraw } = actions
  useEffect(() => {
    if (!renderer || layout.width === 0) return
    renderer.resize(layout.width, layout.height, window.devicePixelRatio || 1, layout.insets)
    redraw()
  }, [renderer, layout, redraw])

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void rootRef.current?.requestFullscreen?.().catch(() => {})
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (guideOpen || (event.key !== 'f' && event.key !== 'F')) return
      toggleFullscreen()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [guideOpen])

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
  const relocateEnabled = config.relocateSeconds > 0

  // Al despegar por primera vez, un aviso señala el botón de pausa unos
  // segundos (se va antes si el jugador pausa o termina la ronda). Se ajusta
  // durante el render, al cambiar la fase, sin un efecto de por medio.
  const [pauseHint, setPauseHint] = useState<'pending' | 'showing' | 'done'>('pending')
  if (pauseHint === 'pending' && hud.phase === 'playing' && !paused) setPauseHint('showing')
  if (pauseHint === 'showing' && (paused || hud.phase !== 'playing')) setPauseHint('done')
  useEffect(() => {
    if (pauseHint !== 'showing') return
    const timer = window.setTimeout(() => setPauseHint('done'), PAUSE_HINT_MS)
    return () => window.clearTimeout(timer)
  }, [pauseHint])

  const pauseButton = (
    <PauseButton compact={compactLandscape} disabled={!playing} highlight={pauseHint === 'showing'} onClick={actions.pause} />
  )

  const controls = (
    <div className="flex shrink-0 items-center gap-1.5 self-center">
      <IconButton small={compactLandscape} label={muted ? 'Activar sonido' : 'Silenciar'} onClick={actions.toggleMute}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </IconButton>
      <IconButton small={compactLandscape} label="Ver la guía" onClick={onOpenGuide}>
        <BookOpen className="h-4 w-4" />
      </IconButton>
      {canFullscreen && (
        <IconButton small={compactLandscape} label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </IconButton>
      )}
    </div>
  )

  const statusStack = (
    <StatusStack hud={hud} lightsEnabled={config.lightsOut} compact={compactLandscape} />
  )

  const hudPanels = compactLandscape ? (
    <aside
      ref={asideRef}
      className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-[236px] p-2"
    >
      <FitScale className="h-full w-full" minScale={0.6} align="top" contentClassName="flex flex-col gap-1.5">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {pauseButton}
          <div className="ml-auto">{controls}</div>
        </div>
        <HudBar hud={hud} compact className="pointer-events-auto w-full" />
        <QuestionPanel hud={hud} title={title} relocateTotal={relocateEnabled ? config.relocateSeconds : 0} compact className="pointer-events-auto" />
        <div className="pointer-events-none relative">{statusStack}</div>
        {coarsePointer && (
          <div className="pointer-events-auto flex justify-center pt-1">
            <DirectionPad onPress={actions.move} size="compact" />
          </div>
        )}
      </FitScale>
    </aside>
  ) : (
    <>
      <div ref={hudRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2 pt-2 sm:px-3">
        <div className="pointer-events-auto flex flex-wrap items-stretch gap-2 xl:flex-nowrap">
          <div className="order-1 flex">{pauseButton}</div>
          <div className="order-2 ml-auto flex sm:order-3 sm:ml-0 xl:order-4">{controls}</div>
          <HudBar hud={hud} className="order-3 basis-full sm:order-2 sm:basis-0 sm:flex-1 xl:flex-none xl:basis-auto" />
          <QuestionPanel
            hud={hud}
            title={title}
            relocateTotal={relocateEnabled ? config.relocateSeconds : 0}
            className="order-4 basis-full xl:order-3 xl:basis-0"
          />
        </div>
        <div className="pointer-events-none relative">{statusStack}</div>
        {portraitPhone && playing && (
          <p className="pointer-events-none mx-auto mt-2 w-fit max-w-full rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-center text-[11.5px] text-slate-300 backdrop-blur">
            Gira el teléfono para ver la nave más grande
          </p>
        )}
        {/* Debajo de todo el HUD: así nunca tapa la afirmación. */}
        {pauseHint === 'showing' && (
          <div className="pointer-events-none absolute left-2 top-full mt-1 sm:left-3">
            <PauseHint />
          </div>
        )}
      </div>
      {coarsePointer && (
        <div ref={bottomPadRef} className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
          <DirectionPad onPress={actions.move} />
        </div>
      )}
    </>
  )

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 overflow-hidden bg-[#04050d] text-slate-100">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Mapa de la nave con el robot, las medusas y las salas Verdadero y Falso"
        className="absolute inset-0 block h-full w-full"
      />
      <div className="absolute inset-0 touch-none select-none" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} />

      {hudPanels}

      {!assets && <LoadingOverlay error={loadError} onExit={onExit} />}
      {assets && hud.phase === 'ready' && (
        <ReadyOverlay
          total={hud.totalQuestions}
          lives={hud.maxLives}
          compact={compactLandscape}
          onStart={actions.start}
          onGuide={onOpenGuide}
          onExit={onExit}
        />
      )}
      {hud.phase === 'intro' && hud.statement && (
        <IntroCard key={hud.questionIndex} index={hud.questionIndex} total={hud.totalQuestions} statement={hud.statement} />
      )}
      {hud.phase === 'feedback' && hud.result && (
        <FeedbackCard hud={hud} top={layout.insets.top} onContinue={actions.skip} compact={compactLandscape} />
      )}
      {paused && !guideOpen && (
        <PauseOverlay
          hud={hud}
          muted={muted}
          fullscreen={fullscreen}
          canFullscreen={canFullscreen}
          onResume={actions.resume}
          onGuide={onOpenGuide}
          onToggleMute={actions.toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onRestart={actions.restart}
          onExit={onExit}
        />
      )}
      {hud.phase === 'finished' && <ResultsOverlay hud={hud} compact={compactLandscape} onRestart={actions.restart} onExit={onExit} />}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  small = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  small?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-slate-200 backdrop-blur transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? 'h-9 w-9' : 'h-10 w-10'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * Botón de pausa: siempre arriba a la izquierda, con texto (no solo un
 * ícono) y la tecla Esc a la vista, para que lo encuentre alguien que no
 * suele jugar videojuegos. Abre el menú de pausa.
 */
function PauseButton({
  compact,
  disabled,
  highlight,
  onClick,
}: {
  compact: boolean
  disabled: boolean
  /** Mientras se ve el aviso "pausa aquí", el botón brilla para que se note de qué habla. */
  highlight: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label="Pausa"
      aria-keyshortcuts="Escape P"
      title="Pausar el juego (Esc)"
      disabled={disabled}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-cyan-300/55 bg-cyan-500/20 font-bold text-white backdrop-blur transition-[background-color,box-shadow] hover:bg-cyan-500/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        highlight ? 'shadow-[0_0_0_3px_rgba(103,232,249,0.55),0_0_30px_-4px_rgba(34,211,238,1)]' : 'shadow-[0_0_24px_-8px_rgba(34,211,238,0.9)]'
      } ${compact ? 'h-9 px-3 text-[13px]' : 'h-10 px-3.5 text-[14px] sm:h-auto sm:min-w-[5rem] sm:flex-col sm:gap-0.5 sm:self-stretch sm:px-3'}`}
      onClick={onClick}
    >
      <Pause className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} fill="currentColor" strokeWidth={1.5} />
      <span className="leading-none">Pausa</span>
      {!compact && (
        <kbd className="hidden rounded-md border border-white/20 bg-black/30 px-1.5 font-sans text-[10px] font-semibold leading-4 text-cyan-100/85 lg:block">
          Esc
        </kbd>
      )}
    </button>
  )
}

/** Aviso que señala el botón de pausa al empezar la primera pregunta (va justo debajo del HUD). */
function PauseHint() {
  return (
    <div
      role="status"
      className="relative mt-2 w-max max-w-[17rem] animate-[fade-in-up_0.4s_ease-out] rounded-2xl border border-cyan-300/50 bg-slate-950/95 px-3.5 py-2 text-[12.5px] leading-snug text-slate-100 shadow-[0_14px_34px_-12px_rgba(34,211,238,0.6)]"
    >
      <span className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 border-l border-t border-cyan-300/50 bg-slate-950" aria-hidden />
      ¿Necesitas un respiro? Toca <b className="text-cyan-200">Pausa</b>, arriba a la izquierda, o presiona{' '}
      <b className="text-cyan-200">Esc</b>.
    </div>
  )
}

function HudBar({ hud, compact = false, className = '' }: { hud: TrueFalseMazeHud; compact?: boolean; className?: string }) {
  const answered = hud.answers.length
  const useDots = hud.totalQuestions <= 14
  const batteryClass = compact ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <div
      className={`flex flex-wrap items-center rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur ${
        compact ? 'gap-x-3 gap-y-1 px-2.5 py-1.5' : 'gap-x-4 gap-y-1.5 px-3 py-1.5'
      } ${className}`}
    >
      <div className="flex items-center gap-1" aria-label={`Vidas: ${hud.lives} de ${hud.maxLives}`}>
        {Array.from({ length: hud.maxLives }, (_, index) =>
          index < hud.lives ? (
            <BatteryFull key={index} className={`${batteryClass} text-emerald-300`} strokeWidth={2} />
          ) : (
            <Battery key={index} className={`${batteryClass} text-slate-600`} strokeWidth={2} />
          ),
        )}
      </div>

      {useDots ? (
        <ol
          className={`flex flex-wrap items-center gap-1 order-3 basis-full ${compact ? '' : 'xl:order-none xl:basis-auto xl:max-w-[250px] xl:flex-1'}`}
          aria-label="Progreso de las afirmaciones"
        >
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
            return <li key={index} className={`h-2.5 rounded-full ${compact ? 'w-3' : 'w-4'} ${tone}`} />
          })}
        </ol>
      ) : (
        <div
          className={`flex items-center gap-2 order-3 basis-full ${compact ? '' : 'xl:order-none xl:basis-auto xl:flex-1'}`}
          aria-label={`Afirmaciones respondidas: ${answered} de ${hud.totalQuestions}`}
        >
          <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
              style={{ width: `${(answered / Math.max(1, hud.totalQuestions)) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold tabular-nums text-slate-300">
            {answered}/{hud.totalQuestions}
          </span>
        </div>
      )}

      <div className={`flex items-center gap-2.5 order-2 ml-auto ${compact ? '' : 'xl:order-none xl:ml-0'}`}>
        <span
          className={`flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[12px] font-bold text-amber-300 ${
            hud.streak >= 2 ? '' : 'invisible'
          }`}
          aria-hidden={hud.streak < 2}
        >
          <Flame className="h-3.5 w-3.5" /> x{Math.max(2, hud.streak)}
        </span>
        <div className="min-w-[4.4rem] text-right">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">Puntos</p>
          <p className="font-heading text-[19px] font-bold leading-none text-white tabular-nums">
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

/**
 * Panel de la afirmación. Su alto es FIJO: si dependiera del largo del texto,
 * el HUD cambiaría de alto en cada pregunta y la nave se reescalaría de golpe.
 * Un texto largo se reduce para caber (la afirmación completa también se
 * muestra grande al empezar cada pregunta).
 */
function QuestionPanel({
  hud,
  title,
  relocateTotal,
  compact = false,
  className = '',
}: {
  hud: TrueFalseMazeHud
  title: string
  relocateTotal: number
  compact?: boolean
  className?: string
}) {
  let label = `${title} · Pregunta ${hud.questionIndex + 1} de ${hud.totalQuestions}`
  let statement = hud.statement ?? ''
  if (hud.phase === 'ready') {
    label = title
    statement = `Responde ${hud.totalQuestions} afirmaciones llevando al robot a la sala correcta.`
  } else if (hud.phase === 'finished') {
    label = title
    statement = hud.won ? '¡Respondiste todas las afirmaciones!' : 'El robot se quedó sin baterías.'
  }

  const showRelocate = relocateTotal > 0 && hud.phase === 'playing' && hud.relocateSeconds !== null
  const relocateFraction = showRelocate ? Math.min(1, (hud.relocateSeconds ?? 0) / relocateTotal) : 0

  return (
    <section
      className={`relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-violet-400/30 bg-slate-950/70 backdrop-blur ${
        compact ? 'h-[7.6rem] px-2.5' : 'h-[5.2rem] flex-1 px-4 sm:h-[5.4rem]'
      } ${className}`}
    >
      <FitScale className="h-full min-w-0 flex-1" fitKey={`${label}|${statement}`} minScale={0.5}>
        <div aria-live="polite">
          <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cyan-300/90">{label}</p>
          <p
            className={`mt-0.5 font-semibold leading-snug text-white ${
              compact ? 'text-[14px]' : 'text-[clamp(1rem,0.6vw+0.85rem,1.45rem)]'
            }`}
          >
            {statement}
          </p>
        </div>
      </FitScale>
      {!compact && (
        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-1.5">
          <AnswerChip kind="TRUE" />
          <AnswerChip kind="FALSE" />
        </div>
      )}
      {showRelocate && (
        <div
          className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10"
          role="progressbar"
          aria-label="Tiempo hasta que las salas cambien de lugar"
          aria-valuemin={0}
          aria-valuemax={relocateTotal}
          aria-valuenow={hud.relocateSeconds ?? 0}
        >
          <div
            className={`h-full transition-[width] duration-1000 ease-linear ${hud.zonesWarning ? 'bg-amber-300' : 'bg-cyan-300/80'}`}
            style={{ width: `${relocateFraction * 100}%` }}
          />
        </div>
      )}
    </section>
  )
}

/** Avisos temporales (atrapado, pulso EMP, salas por cambiar, apagón): flotan bajo el HUD sin mover nada. */
function StatusStack({ hud, lightsEnabled, compact }: { hud: TrueFalseMazeHud; lightsEnabled: boolean; compact: boolean }) {
  const pills: ReactNode[] = []
  if (hud.phase === 'caught') {
    pills.push(
      <Pill key="caught" tone="danger">
        <Flame className="h-4 w-4" /> ¡Una medusa te atrapó!{' '}
        {hud.lives > 0 ? `Te ${hud.lives === 1 ? 'queda 1 batería' : `quedan ${hud.lives} baterías`}.` : ''}
      </Pill>,
    )
  }
  if (hud.phase === 'playing') {
    if (hud.empFraction > 0) {
      pills.push(
        <Pill key="emp" tone="emp">
          <Zap className="h-4 w-4" /> Pulso EMP: ¡atrápalas!
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full rounded-full bg-cyan-300 transition-[width] duration-150" style={{ width: `${hud.empFraction * 100}%` }} />
          </span>
        </Pill>,
      )
    }
    if (hud.zonesWarning) {
      pills.push(
        <Pill key="zones" tone="warn">
          <Timer className="h-4 w-4" /> ¡Las salas van a cambiar de lugar!
        </Pill>,
      )
    }
    if (hud.lightsOut && lightsEnabled) {
      pills.push(
        <Pill key="lights" tone="alert">
          <LightbulbOff className="h-4 w-4" /> ¡Sabotaje! Solo ves cerca del robot
        </Pill>,
      )
    }
  }
  if (pills.length === 0) return null
  return (
    <div
      className={`absolute z-10 flex flex-col items-center gap-1.5 ${compact ? 'left-0 right-0 top-1' : 'left-1/2 top-2 -translate-x-1/2'}`}
      aria-live="polite"
    >
      {pills}
    </div>
  )
}

function Pill({ tone, children }: { tone: 'danger' | 'emp' | 'warn' | 'alert'; children: ReactNode }) {
  const colors = {
    danger: 'border-rose-400/60 bg-rose-950/85 text-rose-100',
    emp: 'border-cyan-300/60 bg-cyan-950/85 text-cyan-100',
    warn: 'animate-pulse border-amber-300/60 bg-amber-950/85 text-amber-100',
    alert: 'animate-pulse border-amber-300/60 bg-slate-950/90 text-amber-100',
  }[tone]
  return (
    <p
      role="status"
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold shadow-lg backdrop-blur ${colors}`}
    >
      {children}
    </p>
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#04050d]/70 p-4">
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
  onGuide,
  onExit,
}: {
  total: number
  lives: number
  compact: boolean
  onStart: () => void
  onGuide: () => void
  onExit: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-[#04050d]/45 p-3 sm:p-6">
      <OverlayCard className="w-full max-w-[520px] animate-[maze-levelup-pop_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        <div className={`flex items-end justify-center gap-4 ${compact ? 'hidden' : ''}`}>
          <img
            src={spaceshipSpriteUrl('robot/robot-down-0')}
            alt="El robot"
            className="h-20 w-auto drop-shadow-[0_0_14px_rgba(34,211,238,0.5)]"
          />
          <img src={spaceshipSpriteUrl('decor/zone-true')} alt="Sala Verdadero" className="hidden h-16 w-auto sm:block" />
          <img src={spaceshipSpriteUrl('decor/zone-false')} alt="Sala Falso" className="hidden h-16 w-auto sm:block" />
          <img
            src={spaceshipSpriteUrl('jellyfish/jelly-down-0')}
            alt="Una medusa galáctica"
            className="h-[4.5rem] w-auto drop-shadow-[0_0_14px_rgba(192,132,252,0.6)]"
          />
        </div>
        <h2 className="mt-3 font-heading text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
          ¿Todo listo, tripulante?
        </h2>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-slate-300">
          Son <b className="text-white">{total} afirmaciones</b> y tienes <b className="text-white">{lives}</b>{' '}
          {lives === 1 ? 'batería' : 'baterías'}. Muévete con las <b className="text-white">flechas del teclado</b> (o W A S D).
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-[15px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(34,211,238,0.7)] transition-transform hover:-translate-y-0.5"
            onClick={onStart}
          >
            <Play className="h-4 w-4" fill="currentColor" /> Despegar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 px-4 py-3 text-[13.5px] font-medium text-slate-200 hover:bg-white/5"
            onClick={onGuide}
          >
            <BookOpen className="h-4 w-4" /> Ver la guía
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-3 text-[13.5px] font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
            onClick={onExit}
          >
            <ArrowLeft className="h-4 w-4" /> Salir
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-slate-400">o presiona cualquier flecha para despegar</p>
        <p className="mt-1 text-[11.5px] text-slate-400">
          ¿Necesitas parar? Usa el botón <b className="text-slate-200">Pausa</b> (arriba a la izquierda) o la tecla{' '}
          <b className="text-slate-200">Esc</b>.
        </p>
      </OverlayCard>
    </div>
  )
}

function IntroCard({ index, total, statement }: { index: number; total: number; statement: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#04050d]/35 p-3 sm:p-6">
      <OverlayCard className="w-full max-w-[640px] border-cyan-300/30 animate-[maze-levelup-pop_0.45s_cubic-bezier(0.16,1,0.3,1)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          Pregunta {index + 1} de {total}
        </p>
        <p className="mt-2 font-heading text-[clamp(1.2rem,2.4vw+0.4rem,1.9rem)] font-bold leading-snug text-white">{statement}</p>
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

function FeedbackCard({ hud, top, compact, onContinue }: { hud: TrueFalseMazeHud; top: number; compact: boolean; onContinue: () => void }) {
  const result = hud.result
  if (!result) return null
  const { correct, question } = result
  // La tarjeta va en la mitad opuesta a la sala elegida: así se ve la sala,
  // el confeti y (si fallaste) cuál era la correcta.
  const atTop = result.zoneCell.row >= SPACESHIP_MAP.rows / 2
  return (
    <div
      className={`absolute inset-x-0 z-20 flex justify-center px-2 sm:px-4 ${atTop ? '' : 'bottom-2 sm:bottom-4'}`}
      style={atTop ? { top } : undefined}
    >
      <div
        role="status"
        className={`w-full max-w-[640px] rounded-3xl border bg-slate-950/90 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md animate-[maze-levelup-pop_0.4s_cubic-bezier(0.16,1,0.3,1)] ${
          compact ? 'p-3' : 'p-4 sm:p-5'
        } ${correct ? 'border-emerald-400/50' : 'border-rose-400/50'}`}
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
                {correct
                  ? `+${result.points.toLocaleString('es')} puntos`
                  : `−1 batería · te ${hud.lives === 1 ? 'queda' : 'quedan'} ${hud.lives}`}
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

/**
 * Menú de pausa: todo lo que se puede hacer sin perder la partida, en botones
 * grandes y con texto. "Empezar de nuevo" y "Salir" piden confirmación porque
 * pierden el progreso.
 */
function PauseOverlay({
  hud,
  muted,
  fullscreen,
  canFullscreen,
  onResume,
  onGuide,
  onToggleMute,
  onToggleFullscreen,
  onRestart,
  onExit,
}: {
  hud: TrueFalseMazeHud
  muted: boolean
  fullscreen: boolean
  canFullscreen: boolean
  onResume: () => void
  onGuide: () => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  onRestart: () => void
  onExit: () => void
}) {
  const [confirm, setConfirm] = useState<'restart' | 'exit' | null>(null)

  // Con una confirmación abierta, Esc la cierra (y no reanuda el juego).
  useEffect(() => {
    if (!confirm) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setConfirm(null)
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [confirm])

  return (
    <div
      className="absolute inset-0 z-30 bg-[#04050d]/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tf-pause-title"
    >
      <FitScale className="h-full w-full" maxWidth={540} minScale={0.55} fitKey={confirm ?? 'menu'}>
        <OverlayCard className="w-full animate-[maze-levelup-pop_0.35s_cubic-bezier(0.16,1,0.3,1)] text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
              <Pause className="h-6 w-6" fill="currentColor" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <h2 id="tf-pause-title" className="font-heading text-[24px] font-bold leading-tight text-white">
                Juego en pausa
              </h2>
              <p className="text-[13px] text-slate-300">Todo está detenido. Continúa cuando quieras.</p>
            </div>
          </div>

          {hud.statement && (
            <div className="mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/[0.08] px-4 py-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cyan-300/90">
                Pregunta {hud.questionIndex + 1} de {hud.totalQuestions}
              </p>
              <p className="mt-1 text-[15px] font-semibold leading-snug text-white">{hud.statement}</p>
              <p className="mt-1.5 text-[12px] text-slate-400">
                {hud.lives === 1 ? 'Te queda 1 batería' : `Te quedan ${hud.lives} baterías`} · {hud.score.toLocaleString('es')} puntos
              </p>
            </div>
          )}

          {confirm ? (
            <div role="alertdialog" aria-labelledby="tf-pause-confirm" className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4">
              <p id="tf-pause-confirm" className="text-[16px] font-bold text-white">
                {confirm === 'restart' ? '¿Empezar de nuevo?' : '¿Salir del juego?'}
              </p>
              <p className="mt-1 text-[13px] text-slate-300">Se pierde lo que llevas de esta partida.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  autoFocus
                  className="rounded-xl bg-rose-500 px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-rose-400"
                  onClick={confirm === 'restart' ? onRestart : onExit}
                >
                  {confirm === 'restart' ? 'Sí, empezar de nuevo' : 'Sí, salir'}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/10"
                  onClick={() => setConfirm(null)}
                >
                  No, volver
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                autoFocus
                className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3.5 text-[16px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(34,211,238,0.7)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={onResume}
              >
                <Play className="h-5 w-5" fill="currentColor" /> Continuar jugando
              </button>
              <div className="mt-2.5 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <MenuButton icon={BookOpen} label="Cómo se juega" onClick={onGuide} />
                <MenuButton icon={muted ? VolumeX : Volume2} label={muted ? 'Sonido: apagado' : 'Sonido: encendido'} onClick={onToggleMute} />
                {canFullscreen && (
                  <MenuButton
                    icon={fullscreen ? Minimize : Maximize}
                    label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    onClick={onToggleFullscreen}
                  />
                )}
                <MenuButton icon={RotateCcw} label="Empezar de nuevo" onClick={() => setConfirm('restart')} />
              </div>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/30 px-4 py-3 text-[14px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/15"
                onClick={() => setConfirm('exit')}
              >
                <LogOut className="h-4 w-4" /> Salir del juego
              </button>
            </>
          )}

          <p className="mt-3 text-center text-[11.5px] text-slate-400">
            Atajo: <Key>Esc</Key> o <Key>P</Key> pausa y continúa · <Key>Espacio</Key> continúa
          </p>
        </OverlayCard>
      </FitScale>
    </div>
  )
}

function MenuButton({ icon: Icon, label, onClick }: { icon: typeof Play; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex min-h-[3rem] items-center gap-2.5 rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-left text-[14px] font-semibold leading-tight text-slate-100 transition-colors hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 shrink-0 text-cyan-300" />
      {label}
    </button>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-px font-sans text-[10.5px] font-semibold text-slate-200">
      {children}
    </kbd>
  )
}

function starsFor(correct: number, total: number): number {
  const ratio = total > 0 ? correct / total : 0
  if (ratio >= 0.9) return 3
  if (ratio >= 0.6) return 2
  if (ratio >= 0.3) return 1
  return 0
}

/**
 * Resultados sin scroll: a un lado el resumen y al otro el repaso. El repaso
 * es una tira de números (verde = acierto, rojo = error) y la explicación de
 * la que se elija, así cabe igual con 3 o con 30 afirmaciones.
 */
function ResultsOverlay({
  hud,
  compact,
  onRestart,
  onExit,
}: {
  hud: TrueFalseMazeHud
  compact: boolean
  onRestart: () => void
  onExit: () => void
}) {
  const correct = hud.answers.filter((answer) => answer.correct).length
  const stars = starsFor(correct, hud.totalQuestions)
  const unanswered = hud.totalQuestions - hud.answers.length
  const firstWrong = hud.answers.findIndex((answer) => !answer.correct)
  const [selected, setSelected] = useState(firstWrong === -1 ? 0 : firstWrong)
  const current = hud.answers[selected]

  return (
    <div className="absolute inset-0 z-40 bg-[#04050d]/85 p-2 backdrop-blur-sm sm:p-5">
      <FitScale className="h-full w-full" maxWidth={1000} minScale={0.5} fitKey={`${selected}|${hud.answers.length}|${compact}`}>
      <OverlayCard
        className={`grid w-full gap-x-6 gap-y-3 animate-[fade-in-up_0.5s_ease-out] landscape:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] ${
          compact ? '!p-3' : ''
        }`}
      >
        <div className="flex min-h-0 flex-col items-center justify-center">
          <img
            src={spaceshipSpriteUrl(hud.won ? 'robot/robot-down-0' : 'robot/robot-up-0')}
            alt=""
            className={`h-auto w-auto drop-shadow-[0_0_16px_rgba(34,211,238,0.55)] ${compact ? 'hidden' : 'max-h-[11dvh] sm:max-h-[14dvh]'}`}
          />
          <h2 className="mt-1.5 font-heading text-[clamp(1.3rem,3.2dvh+0.8vw,1.9rem)] font-bold tracking-tight text-white">
            {hud.won ? '¡Misión completada!' : 'Misión fallida'}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-300">
            {hud.won ? 'El robot llegó a salvo al final del recorrido.' : 'Las medusas y los errores agotaron las baterías.'}
          </p>

          <div className="mt-2 flex justify-center gap-1.5" aria-label={`${stars} de 3 estrellas`}>
            {[0, 1, 2].map((index) => (
              <Star
                key={index}
                className={`h-7 w-7 ${index < stars ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.7)]' : 'text-slate-700'}`}
                fill="currentColor"
              />
            ))}
          </div>

          <div className="mt-3 grid w-full max-w-[380px] grid-cols-3 gap-2">
            <ResultStat label="Puntos" value={hud.score.toLocaleString('es')} />
            <ResultStat label="Aciertos" value={`${correct} / ${hud.totalQuestions}`} />
            <ResultStat label="Mejor racha" value={String(hud.bestStreak)} />
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
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
        </div>

        <div className="flex min-h-0 flex-col gap-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Repaso</h3>
            {unanswered > 0 && (
              <span className="text-[11.5px] text-slate-400">
                {unanswered === 1 ? '1 sin responder' : `${unanswered} sin responder`}
              </span>
            )}
          </div>

          {current ? (
            <>
              <ol className="flex flex-wrap gap-1.5" aria-label="Afirmaciones respondidas">
                {hud.answers.map((answer, index) => (
                  <li key={answer.questionId}>
                    <button
                      type="button"
                      aria-label={`Afirmación ${index + 1}: ${answer.correct ? 'acierto' : 'error'}`}
                      aria-current={index === selected}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[12.5px] font-bold transition-transform ${
                        answer.correct
                          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                          : 'border-rose-400/50 bg-rose-500/20 text-rose-200'
                      } ${index === selected ? 'scale-110 ring-2 ring-white/70' : 'hover:scale-105'}`}
                      onClick={() => setSelected(index)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
              </ol>
              <ReviewDetail
                answer={current}
                index={selected}
                total={hud.answers.length}
                onPrev={() => setSelected((value) => Math.max(0, value - 1))}
                onNext={() => setSelected((value) => Math.min(hud.answers.length - 1, value + 1))}
              />
            </>
          ) : (
            <p className="rounded-2xl bg-white/5 p-4 text-[13px] text-slate-300">
              No alcanzaste a responder ninguna afirmación. ¡Inténtalo de nuevo, esta vez con más cuidado!
            </p>
          )}
        </div>
      </OverlayCard>
      </FitScale>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-0.5 font-heading text-[18px] font-bold text-white tabular-nums">{value}</p>
    </div>
  )
}

function ReviewDetail({
  answer,
  index,
  total,
  onPrev,
  onNext,
}: {
  answer: TfAnswerRecord
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div
      className={`min-h-0 rounded-2xl border p-3 ${
        answer.correct ? 'border-emerald-400/25 bg-emerald-500/[0.07]' : 'border-rose-400/25 bg-rose-500/[0.07]'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            answer.correct ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300'
          }`}
        >
          {answer.correct ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : <X className="h-3.5 w-3.5" strokeWidth={3.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-white">
            {index + 1}. {answer.statement}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-300">
            Es <AnswerChip kind={answer.answer ? 'TRUE' : 'FALSE'} size="sm" />
            {!answer.correct && <span>· elegiste {answer.chosen ? 'Verdadero' : 'Falso'}</span>}
          </p>
          {answer.explanation && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-200">💡 {answer.explanation}</p>
          )}
        </div>
      </div>
      {total > 1 && (
        <div className="mt-2 flex items-center justify-end gap-1.5">
          <button
            type="button"
            aria-label="Afirmación anterior"
            disabled={index === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/10 disabled:opacity-30"
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Afirmación siguiente"
            disabled={index === total - 1}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-slate-200 hover:bg-white/10 disabled:opacity-30"
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Cruceta táctil (solo se muestra en pantallas táctiles; ahí también se puede deslizar sobre el mapa). */
function DirectionPad({ onPress, size = 'normal' }: { onPress: (direction: Direction) => void; size?: 'normal' | 'compact' }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      <span />
      <PadButton direction="UP" onPress={onPress} icon={ArrowUp} label="Arriba" size={size} />
      <span />
      <PadButton direction="LEFT" onPress={onPress} icon={ArrowLeft} label="Izquierda" size={size} />
      <PadButton direction="DOWN" onPress={onPress} icon={ArrowDown} label="Abajo" size={size} />
      <PadButton direction="RIGHT" onPress={onPress} icon={ArrowRight} label="Derecha" size={size} />
    </div>
  )
}

function PadButton({
  direction,
  onPress,
  icon: Icon,
  label,
  size,
}: {
  direction: Direction
  onPress: (direction: Direction) => void
  icon: typeof ArrowUp
  label: string
  size: 'normal' | 'compact'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex items-center justify-center rounded-2xl border border-white/15 bg-slate-950/70 text-slate-100 backdrop-blur active:bg-cyan-400/25 ${
        size === 'compact' ? 'h-11 w-11' : 'h-14 w-14'
      }`}
      onPointerDown={(event) => {
        event.preventDefault()
        onPress(direction)
      }}
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </button>
  )
}
