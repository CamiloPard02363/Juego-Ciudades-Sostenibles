import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { SnakesLaddersChallengeResult, SnakesLaddersPendingChallengeView } from './snakesLaddersTypes'

type ChallengeModalProps = {
  challenge: SnakesLaddersPendingChallengeView
  isSelf: boolean
  answeringDisplayName: string
  result: SnakesLaddersChallengeResult | null
  onAnswer: (optionIndex: number) => void
}

const TRIGGER_LABEL: Record<SnakesLaddersPendingChallengeView['triggerType'], string> = {
  CELL: 'Reto de casilla',
  LADDER: '¡Escalera! Reto de alta complejidad',
  SNAKE: 'Serpiente — reto de recuperación',
}

/**
 * Modal del reto: se muestra a todos (modo espectador para quien no le toca),
 * solo quien lo recibió puede responder. El feedback (correcto/incorrecto)
 * llega después vía `snakes-ladders:challenge-result` — nunca se sabe la
 * respuesta correcta antes de responder.
 */
export function ChallengeModal({ challenge, isSelf, answeringDisplayName, result, onAnswer }: ChallengeModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    setSelectedIndex(null)
  }, [challenge.cellNumber, challenge.triggerType])

  function handleSelect(index: number) {
    if (!isSelf || selectedIndex !== null) return
    setSelectedIndex(index)
    onAnswer(index)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <p
          className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
            challenge.triggerType === 'LADDER'
              ? 'text-emerald-500'
              : challenge.triggerType === 'SNAKE'
                ? 'text-rose-500'
                : 'text-accent'
          }`}
        >
          {TRIGGER_LABEL[challenge.triggerType]} — casilla {challenge.cellNumber}
        </p>
        <h2 className="mb-4 text-[17px] font-semibold leading-snug text-text-h">{challenge.prompt}</h2>

        <div className="flex flex-col gap-2">
          {challenge.options.map((option, index) => {
            const isChosen = selectedIndex === index;
            const isCorrectReveal = result !== null && result.correctOptionIndex === index;
            const isWrongChosen = result !== null && isChosen && !result.correct;
            return (
              <button
                key={index}
                type="button"
                disabled={!isSelf || selectedIndex !== null}
                onClick={() => handleSelect(index)}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-[14px] transition-colors disabled:cursor-not-allowed ${
                  isCorrectReveal
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-600'
                    : isWrongChosen
                      ? 'border-rose-400 bg-rose-400/10 text-rose-600'
                      : isChosen
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-h hover:border-accent/40'
                }`}
              >
                <span>{option}</span>
                {isCorrectReveal && <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />}
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
                  ? '¡Correcto!'
                  : 'Incorrecto.'}
        </p>
      </div>
    </div>
  )
}
