import { TextField } from '../../TextField'

export type QuestionDraft = {
  prompt: string
  options: string[]
  correctOptionIndex: number
}

export const MIN_QUESTION_OPTIONS = 2
export const MAX_QUESTION_OPTIONS = 4

export function emptyQuestionDraft(): QuestionDraft {
  return { prompt: '', options: ['', ''], correctOptionIndex: 0 }
}

type QuestionEditorProps = {
  question: QuestionDraft
  disabled: boolean
  fieldPrefix: string
  onChange: (next: QuestionDraft) => void
}

/** Mini-formulario de pregunta de opción múltiple: prompt + opciones (2-4) con radio de la correcta. Usado tanto por ítems como por preguntas de zona. */
export function QuestionEditor({ question, disabled, fieldPrefix, onChange }: QuestionEditorProps) {
  function updateOption(optionIndex: number, value: string) {
    const options = question.options.map((option, i) => (i === optionIndex ? value : option))
    onChange({ ...question, options })
  }

  function addOption() {
    if (question.options.length >= MAX_QUESTION_OPTIONS) return
    onChange({ ...question, options: [...question.options, ''] })
  }

  function removeOption(optionIndex: number) {
    if (question.options.length <= MIN_QUESTION_OPTIONS) return
    const options = question.options.filter((_, i) => i !== optionIndex)
    const correctOptionIndex = Math.min(question.correctOptionIndex, options.length - 1)
    onChange({ ...question, options, correctOptionIndex })
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-bg p-3">
      <TextField
        label="Pregunta"
        type="text"
        value={question.prompt}
        disabled={disabled}
        onChange={(value) => onChange({ ...question, prompt: value })}
        onBlur={() => {}}
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-[12px] font-medium text-text-h">Opciones (marca la correcta)</p>
        {question.options.map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${fieldPrefix}-correct`}
              checked={question.correctOptionIndex === optionIndex}
              disabled={disabled}
              onChange={() => onChange({ ...question, correctOptionIndex: optionIndex })}
            />
            <input
              type="text"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-text-h outline-none focus:border-accent"
              placeholder={`Opción ${optionIndex + 1}`}
              value={option}
              disabled={disabled}
              onChange={(event) => updateOption(optionIndex, event.target.value)}
            />
            {question.options.length > MIN_QUESTION_OPTIONS && (
              <button
                type="button"
                className="text-[12px] font-medium text-danger"
                onClick={() => removeOption(optionIndex)}
                disabled={disabled}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        {question.options.length < MAX_QUESTION_OPTIONS && (
          <button type="button" className="self-start text-[12px] font-medium text-accent" onClick={addOption} disabled={disabled}>
            + Agregar opción
          </button>
        )}
      </div>
    </div>
  )
}
