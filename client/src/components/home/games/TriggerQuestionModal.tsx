import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { DualQuestPendingQuestionView, DualQuestTriggerResult } from './dualQuestTypes'

type TriggerQuestionModalProps = {
  question: DualQuestPendingQuestionView
  isSelf: boolean
  answeringDisplayName: string
  result: DualQuestTriggerResult | null
  onAnswer: (optionIndex: number) => void
}

/**
 * Modal de la pregunta de un trigger: mismo patrón que ChallengeModal de
 * Escaleras y Serpientes (modo espectador para quien no responde, feedback
 * después de que el servidor corrige) — acá el rol que activó el
 * interruptor es quien contesta, nunca se sabe la respuesta antes.
 */
export function TriggerQuestionModal({ question, isSelf, answeringDisplayName, result, onAnswer }: TriggerQuestionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    setSelectedIndex(null)
  }, [question.triggerId])

  function handleSelect(index: number) {
    if (!isSelf || selectedIndex !== null) return
    setSelectedIndex(index)
    onAnswer(index)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
          Interruptor de {question.forRole === 'FIRE' ? 'Fuego' : 'Agua'}
        </p>
        <h2 className="mb-4 text-[17px] font-semibold leading-snug text-text-h">{question.prompt}</h2>

        <div className="flex flex-col gap-2">
          {question.options.map((option, index) => {
            const isChosen = selectedIndex === index
            const isWrongChosen = result !== null && isChosen && !result.correct
            const isRightChosen = result !== null && isChosen && result.correct
            return (
              <button
                key={index}
                type="button"
                disabled={!isSelf || selectedIndex !== null}
                onClick={() => handleSelect(index)}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-[14px] transition-colors disabled:cursor-not-allowed ${
                  isRightChosen
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-600'
                    : isWrongChosen
                      ? 'border-rose-400 bg-rose-400/10 text-rose-600'
                      : isChosen
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-h hover:border-accent/40'
                }`}
              >
                <span>{option}</span>
                {isRightChosen && <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />}
                {isWrongChosen && <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-center text-[12.5px] text-text">
          {!isSelf
            ? `Esperando la respuesta de ${answeringDisplayName}…`
            : selectedIndex === null
              ? 'Elige una opción.'
              : result === null
                ? 'Enviando respuesta…'
                : result.correct
                  ? '¡Correcto! La compuerta se abrió.'
                  : 'Incorrecto — puedes volver a intentarlo parándote en el interruptor.'}
        </p>
      </div>
    </div>
  )
}
