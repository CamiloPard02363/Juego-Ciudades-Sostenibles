import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Droplets, Hand, Leaf, Link2, PackageOpen, Sparkles, Wind, type LucideIcon } from 'lucide-react'

const scenes = [
  { title: 'Tu objetivo', text: 'Vacía tu mano antes que tu rival.', icon: Sparkles },
  { title: 'Busca una coincidencia', text: 'Elige una ficha que tenga el mismo concepto que uno de los extremos.', icon: Hand },
  { title: 'Conecta el concepto', text: 'Ponla en el extremo donde ambas mitades coinciden.', icon: Link2 },
  { title: 'Si no hay coincidencia', text: 'Roba del pozo. Si está vacío, pasa el turno.', icon: PackageOpen },
]

const primaryButton = 'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent'
const secondaryButton = 'flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[13px] font-semibold text-text-h transition-colors hover:border-accent hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40'
const gradient = { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }

type Concept = { label: string; color: string; icon: LucideIcon }
const orbit: Concept = { label: 'A', color: '#5c4f80', icon: Leaf }
const peak: Concept = { label: 'B', color: '#765c22', icon: Wind }
const spark: Concept = { label: 'C', color: '#32626d', icon: Droplets }

/** Guía visual reutilizable: las ediciones cambian de tema, la regla de conexión se mantiene. */
export function DominoVisualDemo({ onContinue }: { onContinue: () => void }) {
  const [scene, setScene] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const current = scenes[scene]

  useEffect(() => { heading.current?.focus() }, [scene])

  return (
    <div className="space-y-4" data-domino-demo>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-text">
        <span>Dominexo · Aprende jugando</span>
        <span className="font-semibold text-accent" aria-live="polite">{scene + 1} de {scenes.length}</span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {scenes.map((step, index) => <span key={step.title} className={`h-1.5 flex-1 rounded-full ${index <= scene ? 'bg-accent' : 'bg-border'}`} />)}
      </div>
      <h3 ref={heading} tabIndex={-1} className="text-[18px] font-bold text-text-h focus:outline-none">{current.title}</h3>

      <div className="rounded-2xl border border-border bg-code-bg p-4 sm:p-6">
        <div key={scene} className="grid items-center gap-5 animate-[fade-in-up_0.35s_ease-out] motion-reduce:animate-none sm:grid-cols-[minmax(0,1fr)_minmax(260px,1.2fr)] sm:gap-8">
          <div className="text-center sm:text-left">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent sm:mx-0">
              <current.icon className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <p className="mt-3 text-[17px] font-bold leading-relaxed text-text-h">{current.text}</p>
            {scene === 0 && <p className="mt-2 text-[13px] text-text">Cada edición puede cambiar de tema; la regla siempre es unir las mismas piezas: A con A, B con B.</p>}
          </div>
          <DominoScene scene={scene} />
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Navegación de la guía de Dominexo">
        <button type="button" className={secondaryButton} onClick={() => setScene((currentScene) => currentScene - 1)} disabled={scene === 0}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Anterior
        </button>
        {scene < scenes.length - 1 ? (
          <button type="button" className={`${primaryButton} ml-auto`} style={gradient} onClick={() => setScene((currentScene) => currentScene + 1)}>
            Siguiente<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className={`${primaryButton} ml-auto`} style={gradient} onClick={onContinue}>
            <Check className="h-4 w-4" aria-hidden="true" />¡Entendido, vamos a jugar!
          </button>
        )}
      </nav>
    </div>
  )
}

function DominoScene({ scene }: { scene: number }) {
  const selected = scene === 1 || scene === 2
  const connected = scene === 2
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-surface p-3 shadow-[0_10px_24px_-18px_var(--accent)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      {scene === 3 ? (
        <div className="relative flex min-h-[150px] flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-3" aria-label="Bolsa de fichas y ficha robada">
            <div className="relative h-[96px] w-[78px] animate-[domino-demo-well_1s_ease-in-out_both] motion-reduce:animate-none" aria-hidden="true">
              <span className="absolute left-[26px] top-0 grid h-9 w-9 animate-[domino-demo-card-peek_0.7s_cubic-bezier(0.16,1,0.3,1)_both] place-items-center rounded-lg border-2 border-text-h/65 bg-sky-100 text-base font-black text-sky-700 shadow-[0_5px_10px_-6px_rgba(0,0,0,0.8)]">C</span>
              <span className="absolute left-[8px] top-[23px] h-[48px] w-2 rounded-full bg-slate-600 shadow-sm" />
              <span className="absolute right-[8px] top-[23px] h-[48px] w-2 rounded-full bg-slate-600 shadow-sm" />
              <span className="absolute left-[13px] top-[20px] h-4 w-[52px] rounded-t-[14px] border-2 border-slate-700 bg-slate-400 shadow-sm" />
              <span className="absolute bottom-0 left-[6px] h-[35px] w-[64px] rounded-b-[24px] rounded-t-[12px] border-2 border-text-h/45 bg-[#d8e1e8] shadow-[0_9px_15px_-10px_rgba(0,0,0,0.7)]">
                <span className="absolute left-2 top-2 h-2 w-3 rounded bg-white/55" />
                <span className="absolute left-7 top-2 h-2 w-4 rounded bg-slate-400/35" />
                <span className="absolute left-4 top-5 h-2 w-5 rounded bg-slate-400/35" />
                <span className="absolute right-3 top-5 h-2 w-3 rounded bg-white/55" />
                <span className="absolute left-[9px] top-[-5px] h-3 w-10 rounded-full border-2 border-slate-600 bg-slate-300" />
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-accent" aria-hidden="true" />
            <div className="flex h-14 w-14 animate-[domino-demo-draw_0.8s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-lg border-2 border-text-h/65 shadow-sm motion-reduce:animate-none">
              <span className="flex flex-1 items-center justify-center bg-sky-100 text-xl font-black text-sky-700">C</span>
              <span className="w-px bg-text-h/70" />
              <span className="flex flex-1 items-center justify-center bg-amber-100 text-xl font-black text-amber-800">B</span>
            </div>
          </div>
          <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-[12px] font-bold text-accent">Roba una ficha del pozo</span>
          <span className="text-[11px] text-text">Si el pozo está vacío, pasa el turno.</span>
        </div>
      ) : (
        <div className="relative">
          <p className="mb-2 text-center text-[10px] font-semibold tracking-wide text-text/70 uppercase">Tablero</p>
          <div className="flex items-center justify-center gap-1.5">
            <MiniTile context="board" left={peak} right={orbit} animationClass={scene === 0 ? 'animate-[domino-demo-board_0.7s_ease-out_both]' : undefined} />
            {connected && <MiniTile context="board" left={orbit} right={spark} entering />}
            {!connected && <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-accent/60 bg-accent/5 text-[17px] font-bold text-accent animate-[result-glow-pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none">+</span>}
          </div>
          <p className="mb-2 mt-5 text-center text-[10px] font-semibold tracking-wide text-text/70 uppercase">Tu mano</p>
          <div className="flex items-center justify-center gap-2">
            <MiniTile context="hand" left={spark} right={peak} />
            {!connected && <MiniTile context="hand" left={orbit} right={spark} selected={selected} animationClass={scene === 1 ? 'animate-[domino-demo-select_0.75s_cubic-bezier(0.16,1,0.3,1)_both]' : undefined} />}
          </div>
          {scene === 1 && <p className="mt-3 text-center text-[11px] font-semibold text-accent">La pieza A coincide con el extremo A.</p>}
          {scene === 2 && <p className="mt-3 text-center text-[11px] font-semibold text-accent">La ficha A/C sube desde tu mano y se conecta.</p>}
        </div>
      )}
    </div>
  )
}

type DemoTileContext = 'board' | 'hand'

export function demoTileHalfPresentation(context: DemoTileContext, label: string) {
  return {
    showLabel: context === 'hand',
    ariaLabel: `Concepto ${label}`,
    title: `Concepto ${label}`,
  }
}

function MiniTile({ context, left, right, selected = false, entering = false, animationClass }: { context: DemoTileContext; left: Concept; right: Concept; selected?: boolean; entering?: boolean; animationClass?: string }) {
  return <div
    className={`flex h-[88px] w-[134px] overflow-hidden rounded-xl border-2 bg-[var(--domino-tile-surface)] shadow-[0_10px_18px_-13px_rgba(0,0,0,0.85)] transition-all sm:h-[108px] sm:w-[174px] ${selected ? 'ring-4 ring-accent/20 -translate-y-1 scale-[1.04] shadow-[0_14px_26px_-12px_var(--accent)]' : ''} ${entering ? 'animate-[domino-demo-connect_0.55s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none' : ''} ${animationClass ?? ''}`}
    style={{ borderColor: selected ? 'var(--accent)' : 'var(--domino-tile-border)' }}
  >
    <TileHalf concept={left} context={context} side="left" />
    <div className="w-px shrink-0 bg-[var(--domino-tile-divider)]" />
    <TileHalf concept={right} context={context} side="right" />
  </div>
}

function TileHalf({ concept, context, side }: { concept: Concept; context: DemoTileContext; side: 'left' | 'right' }) {
  const Icon = concept.icon
  const presentation = demoTileHalfPresentation(context, concept.label)
  return <div
    className={`flex flex-1 flex-col items-center justify-center gap-1 px-1 ${side === 'left' ? 'rounded-l-[9px]' : 'rounded-r-[9px]'}`}
    role="img"
    aria-label={presentation.ariaLabel}
    title={presentation.title}
    style={{ color: concept.color }}
  >
    <Icon className={context === 'board' ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-6 w-6 sm:h-7 sm:w-7'} strokeWidth={2.2} aria-hidden="true" />
    {presentation.showLabel && <span className="text-[18px] leading-none font-black tracking-tight sm:text-[22px]">{concept.label}</span>}
  </div>
}
