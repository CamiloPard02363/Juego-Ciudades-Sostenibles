import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { MazeCollectorItem } from './mazeCollectorTypes'
import { Modal } from './Modal'

type MazeCollectorQuestionModalProps = {
  item: MazeCollectorItem
  onAnswer: (selectedIndex: number) => void
}

/** Tiempo que se muestra el feedback correcto/incorrecto antes de reanudar el juego. */
const FEEDBACK_DELAY_MS = 1200

/**
 * Pregunta de opción múltiple mostrada al recolectar un ítem con `question`.
 * Bloquea el juego (el hook pausa el tick mientras esto está montado) hasta
 * que el jugador responde y ve el feedback.
 */
export function MazeCollectorQuestionModal({ item, onAnswer }: MazeCollectorQuestionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const question = item.question
  if (!question) return null

  function handleSelect(index: number) {
    if (selectedIndex !== null) return
    setSelectedIndex(index)
    setTimeout(() => onAnswer(index), FEEDBACK_DELAY_MS)
  }

  return (
    <Modal onClose={() => {}} maxWidthClassName="max-w-[440px]">
      <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-accent">
        Recolectaste: {item.label}
      </p>
      <h2 className="mb-4 text-[17px] leading-snug text-text-h">{question.prompt}</h2>

      <div className="flex flex-col gap-2">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index
          const isCorrect = index === question.correctOptionIndex
          const showFeedback = selectedIndex !== null

          let stateClasses = 'border-border bg-bg text-text-h hover:border-accent'
          let style: CSSProperties | undefined
          if (showFeedback && isCorrect) {
            style = { borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.12)' }
          } else if (showFeedback && isSelected && !isCorrect) {
            stateClasses = 'border-danger bg-danger/10 text-text-h'
          } else if (showFeedback) {
            stateClasses = 'border-border bg-bg text-text/60'
          }

          return (
            <button
              key={index}
              type="button"
              className={`rounded-lg border px-4 py-2.5 text-left text-[14px] font-medium transition-colors disabled:cursor-default ${stateClasses}`}
              style={style}
              onClick={() => handleSelect(index)}
              disabled={showFeedback}
            >
              {option}
            </button>
          )
        })}
      </div>

      {selectedIndex !== null && (
        <p className="mt-4 text-center text-[13px] font-medium text-text-h">
          {selectedIndex === question.correctOptionIndex ? '¡Correcto! 🎉' : 'No era esa, ¡sigue aprendiendo! 🌱'}
        </p>
      )}
    </Modal>
  )
}
