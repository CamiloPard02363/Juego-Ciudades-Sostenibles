import { useState } from 'react'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Modal } from './Modal'
import { gameInstructions, type InstructionKind } from './gameInstructions'

/** El juego no se monta hasta continuar: no hay relojes, controles ni salas activos detrás. */
export function GameInstructionsGate({ kind, children }: { kind: InstructionKind; children: ReactNode }) {
  const [accepted, setAccepted] = useState(false)
  if (accepted) return children
  const content = gameInstructions[kind]
  const onContinue = () => setAccepted(true)
  return (
    <Modal onClose={onContinue} maxWidthClassName="max-w-[520px]">
      <div className="space-y-5" data-game-instructions={kind}>
        <div className="rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent p-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Nexus Play</p>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight text-text-h">Cómo jugar</h2>
        </div>
        <p className="text-[13.5px] leading-relaxed text-text">{content.text}</p>
        <div className="rounded-2xl border border-border bg-code-bg p-4">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-accent">{content.exampleTitle}</p>
          <div className="flex items-center justify-center gap-2 overflow-hidden">
            <div className="flex h-[68px] w-[136px] shrink-0 overflow-hidden rounded-lg border-[3px] border-accent bg-surface shadow-[var(--shadow)]">
              <ExampleHalf label={content.labels[0]} Icon={content.icons[0]} color="#f59e0b" />
              <div className="h-full w-[3px] bg-border" />
              <ExampleHalf label={content.labels[1]} Icon={content.icons[1]} color="#22c55e" />
            </div>
            <span className="text-[18px] font-bold text-accent">+</span>
            <div className="flex h-[68px] w-[136px] shrink-0 overflow-hidden rounded-lg border-[3px] border-accent bg-surface shadow-[var(--shadow)]">
              <ExampleHalf label={content.labels[2]} Icon={content.icons[2]} color="#22c55e" />
              <div className="h-full w-[3px] bg-border" />
              <ExampleHalf label={content.labels[3]} Icon={content.icons[3]} color="#f59e0b" />
            </div>
          </div>
          <p className="mt-3 text-center text-[12px] text-text">{content.caption}</p>
        </div>
        <button type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }} onClick={onContinue}>
          <Check className="h-4 w-4" strokeWidth={2.25} />
          Entendido, continuar
        </button>
      </div>
    </Modal>
  )
}

/** Conserva el tamaño y los estilos del ejemplo original; solo varían icono y acción. */
function ExampleHalf({ label, Icon, color }: { label: string; Icon: LucideIcon; color: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center px-1.5 py-2.5 gap-1"
    style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
    <Icon className="h-6 w-6" style={{ color }} strokeWidth={2} />
    <span className="text-center leading-tight font-semibold text-text-h text-[9.5px]">{label}</span>
  </div>
}
