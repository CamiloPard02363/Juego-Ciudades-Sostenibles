import { useState } from 'react'
import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Modal } from './Modal'
import { gameInstructions, type InstructionKind } from './gameInstructions'
import { GuessWhoVisualDemo } from './GuessWhoVisualDemo'
import { flagsDemoExample, type GuessWhoDemoExample } from './guessWhoDemoExamples'
import { DominoVisualDemo } from './DominoVisualDemo'
import { MemoryMatchDemo } from './MemoryMatchFlash'

const SEEN_KEY_PREFIX = 'nexusplay:guia-vista:'

/** Si esta guía ya se vio antes en este navegador (para ofrecer saltarla). Nunca lanza. */
function wasSeen(kind: InstructionKind): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY_PREFIX + kind) === '1'
  } catch {
    return false
  }
}

function markSeen(kind: InstructionKind): void {
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + kind, '1')
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): solo no se recuerda.
  }
}

/**
 * El juego no se monta hasta continuar: no hay relojes, controles ni salas activos detrás.
 *
 * Arriba a la derecha siempre está "Saltar guía", para quien ya jugó antes
 * (si esta guía ya se vio en este navegador, el botón lo dice). La ventana
 * nunca tiene scroll: si no cabe, se reduce para que se vea entera (ver
 * `fitContent` en Modal). El Laberinto V/F tiene su propia guía y no pasa por acá.
 */
export function GameInstructionsGate({ kind, children, guessWhoExample = flagsDemoExample }: { kind: InstructionKind; children: ReactNode; guessWhoExample?: GuessWhoDemoExample }) {
  const [accepted, setAccepted] = useState(false)
  const [seenBefore] = useState(() => wasSeen(kind))
  if (accepted) return children
  const content = gameInstructions[kind]
  const onContinue = () => {
    markSeen(kind)
    setAccepted(true)
  }
  const isGuessWho = kind === 'GUESS_WHO' || kind === 'GUESS_WHO_GROUP'
  const isDomino = kind === 'DOMINO'
  const hasVisualDemo = isGuessWho || isDomino
  // MatchMente: demostración animada en vez de párrafo (issue #30).
  const isMemory = kind === 'PAIRS' || kind === 'OPPOSITES'
  return (
    <Modal onClose={onContinue} fitContent maxWidthClassName={hasVisualDemo ? 'max-w-[1120px]' : 'max-w-[520px]'} maxHeightClassName="max-h-[calc(100dvh-40px)]" ariaLabel={isGuessWho ? 'Cómo jugar a Identidad Oculta' : isDomino ? 'Cómo jugar a Dominexo' : undefined}>
      <div className="space-y-4" data-game-instructions={kind}>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-accent/12 via-accent/5 to-transparent px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">Nexus Play</p>
            <h2 className="text-[22px] font-bold tracking-tight text-text-h">Cómo jugar</h2>
          </div>
          <button
            type="button"
            data-skip-guide
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] font-semibold text-text-h transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            onClick={onContinue}
          >
            {seenBefore ? 'Ya lo jugué · Saltar guía' : 'Saltar guía'}
            <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        {isGuessWho ? <GuessWhoVisualDemo example={guessWhoExample} onContinue={onContinue} /> : isDomino ? <DominoVisualDemo onContinue={onContinue} /> : <>
        {isMemory ? <MemoryMatchDemo opposites={kind === 'OPPOSITES'} /> : <>
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
        </>}
        <button type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }} onClick={onContinue}>
          <Check className="h-4 w-4" strokeWidth={2.25} />
          Entendido, continuar
        </button>
        </>}
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
