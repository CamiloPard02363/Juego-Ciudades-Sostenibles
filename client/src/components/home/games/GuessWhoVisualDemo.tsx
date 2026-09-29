import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleHelp, MessageCircle, Sparkles, UserRound, X } from 'lucide-react'
import type { GuessWhoDemoExample } from './guessWhoDemoExamples'

const sceneTitles = ['Descubre el objetivo', 'Haz una pregunta', 'Escucha y descarta', 'Cambia el turno', 'Adivina con cuidado']
const secondaryButton = 'flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[13px] font-semibold text-text-h transition-colors hover:border-accent hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40'
const primaryButton = 'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-12px_var(--accent)] transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent'
const gradient = { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }

/** Solo estado de presentación. No importa hooks de sala, servicios, sockets ni relojes. */
export function GuessWhoVisualDemo({ example, onContinue }: { example: GuessWhoDemoExample; onContinue: () => void }) {
  const [scene, setScene] = useState(0)
  const [correct, setCorrect] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const activePlayer = scene === 0 ? null : scene === 3 || (scene === 4 && !correct) ? 1 : 0
  const selected = scene === 4 ? (correct ? example.correctGuess.optionId : example.wrongGuess.optionId) : null

  useEffect(() => { heading.current?.focus() }, [scene, correct])

  function move(next: number) {
    setCorrect(false)
    setScene(next)
  }

  function keepFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
      event.preventDefault(); last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus()
    }
  }

  return (
    <div ref={root} onKeyDown={keepFocus} className="space-y-4" data-guess-who-demo={example.edition}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-text">
        <span>Identidad Oculta · Ejemplo: {example.edition}</span>
        <span className="font-semibold text-accent" aria-live="polite">{scene + 1} de 5</span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {sceneTitles.map((title, index) => <span key={title} className={`h-1.5 flex-1 rounded-full ${index <= scene ? 'bg-accent' : 'bg-border'}`} />)}
      </div>
      <h3 ref={heading} tabIndex={-1} className="text-[18px] font-bold text-text-h focus:outline-none">{sceneTitles[scene]}</h3>

      <div className="rounded-2xl border border-border bg-code-bg p-3 sm:p-4 lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 lg:p-6">
        <div className="min-w-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {[0, 1].map(player => <div key={player} className={player === 1 ? 'col-start-3 row-start-1' : 'col-start-1 row-start-1'}>
            <div className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-center transition-colors duration-300 ${activePlayer === player ? 'border-accent bg-accent/10 shadow-[var(--shadow)]' : 'border-transparent'}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${player === 0 ? 'bg-accent/15 text-accent' : 'bg-surface text-text-h'}`}>
                <UserRound className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-[12px] font-semibold text-text-h">{player === 0 ? 'Tú' : 'Tu rival'}</span>
              <span className="min-h-8 text-[11px] font-semibold leading-tight text-accent" data-active-player={activePlayer === player ? player : undefined}>
                {activePlayer === player ? player === 0 ? 'Tu turno' : 'Turno de tu rival' : ' '}
              </span>
            </div>
          </div>)}
          <div className="col-start-2 row-start-1 flex h-16 w-11 items-center justify-center rounded-lg border-2 border-accent bg-surface text-accent shadow-[var(--shadow)]" role="img" aria-label={scene === 4 && correct ? 'Identidad descubierta' : 'Identidad oculta de tu rival'}>
            {scene === 4 && correct ? <Check aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}
          </div>
        </div>

        <div key={`${scene}-${correct}`} className="mt-3 space-y-3 animate-[fade-in-up_0.35s_ease-out] motion-reduce:animate-none">
          {scene === 0 && <p className="text-center text-[13.5px] leading-relaxed text-text">Tu rival tiene una identidad oculta. Haz preguntas para descubrirla.</p>}
          {(scene === 1 || scene === 2) && <>
            <Bubble speaker="Tú" text={example.question} />
            {scene === 1 ? <div className="flex justify-end gap-2" aria-label="Respuestas posibles: Sí o No">
              <span className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[13px] font-semibold text-accent"><Check className="h-4 w-4" aria-hidden="true" />Sí</span>
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[13px] font-semibold text-text-h"><X className="h-4 w-4" aria-hidden="true" />No</span>
            </div> : <Bubble speaker="Tu rival" text={example.answer} rival />}
          </>}
          {scene === 2 && <p className="text-[13px] text-text">Descarta las opciones que ya no coinciden.</p>}
          {scene === 3 && <>
            <p className="text-[13px] text-text">Ahora juega tu rival.</p>
            <Bubble speaker="Tu rival" text={example.rivalQuestion} rival />
          </>}
          {scene === 4 && <>
            {correct && <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">En otro turno</span>}
            <Bubble speaker="Tú" text={correct ? example.correctGuess.question : example.wrongGuess.question} />
            <p role="status" className={`flex items-center gap-2 rounded-xl border p-3 text-[13px] font-semibold ${correct ? 'border-accent/40 bg-accent/10 text-accent' : 'border-danger/40 bg-danger/10 text-danger'}`}>
              {correct ? <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" /> : <X className="h-5 w-5 shrink-0" aria-hidden="true" />}
              {correct ? '¡Correcto! Descubriste la identidad oculta.' : 'No es correcto. Pierdes el turno.'}
            </p>
          </>}
        </div>

        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 lg:mt-0 lg:gap-3" aria-label="Opciones del ejemplo">
          {example.options.map((option, index) => {
            const discarded = scene >= 2 && !option.matchesAnswer
            const chosen = selected === option.id
            return <li key={option.id} aria-label={`${option.label}${discarded ? ', descartada' : chosen ? ', seleccionada' : ''}`} data-demo-discarded={discarded || undefined}
              className={`relative min-w-0 rounded-lg border-2 p-1.5 ${chosen ? correct ? 'border-accent ring-2 ring-accent/30' : 'border-danger ring-2 ring-danger/20' : 'border-border'} ${discarded && scene === 2 ? 'animate-[guess-who-demo-discard_0.7s_ease-out_both] motion-reduce:animate-none' : 'bg-surface'}`}
              style={discarded && scene === 2 ? { animationDelay: `${index * 90}ms` } : undefined}>
              <div className={`mx-auto aspect-[3/2] w-full max-w-[90px] overflow-hidden sm:max-w-[130px] ${discarded ? 'opacity-40' : ''}`}>{option.visual}</div>
              <p className="mt-1 break-words text-center text-[10px] font-semibold text-text-h sm:text-[12px]">{option.label}</p>
              {discarded && <span className="absolute inset-0 flex items-center justify-center rounded-md bg-surface/30" aria-hidden="true"><X className="h-14 w-14 max-w-full text-red-600 drop-shadow-sm sm:h-20 sm:w-20" strokeWidth={4} /></span>}
              {chosen && <span className="absolute -right-1 -top-1 rounded-full bg-surface p-0.5" aria-hidden="true">{correct ? <Check className="h-4 w-4 text-accent" /> : <X className="h-4 w-4 text-danger" />}</span>}
            </li>
          })}
        </ul>
      </div>

      {scene === 4 && correct && <p className="text-center text-[12px] font-semibold leading-relaxed text-accent">Pregunta → Escucha → Descarta → Cambia el turno → Adivina</p>}

      <nav className="flex flex-wrap gap-2" aria-label="Navegación del simulacro">
        <button type="button" className={secondaryButton} onClick={() => move(scene - 1)} disabled={scene === 0}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Anterior</button>
        {scene < 4 ? <button type="button" className={`${primaryButton} ml-auto`} style={gradient} onClick={() => move(scene + 1)}>Siguiente<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          : !correct ? <button type="button" className={`${primaryButton} ml-auto`} style={gradient} onClick={() => setCorrect(true)}>Ver un acierto<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          : <button type="button" className={`${primaryButton} w-full`} style={gradient} onClick={onContinue}><Check className="h-4 w-4 shrink-0" aria-hidden="true" />¡Entendido, vamos a jugar!</button>}
      </nav>
    </div>
  )
}

function Bubble({ speaker, text, rival = false }: { speaker: string; text: string; rival?: boolean }) {
  return <div className={`flex gap-2 ${rival ? 'justify-end' : ''}`}>
    <div className={`max-w-full rounded-2xl border border-accent/25 px-3 py-2 ${rival ? 'rounded-tr-sm bg-surface' : 'rounded-tl-sm bg-accent/10'}`}>
      <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent"><MessageCircle className="h-3 w-3" aria-hidden="true" />{speaker}</span>
      <p className="text-[13px] font-semibold text-text-h">{text}</p>
    </div>
  </div>
}
