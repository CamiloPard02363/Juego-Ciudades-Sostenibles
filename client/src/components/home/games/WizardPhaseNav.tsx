type WizardPhaseNavProps = {
  onBack: () => void
  backLabel?: string
  onNext?: () => void
  nextLabel?: string
  /** true en la última fase: en vez de "Siguiente" se muestra el submit real (se pasa como children). */
  isLastPhase: boolean
  submitting: boolean
  children?: never
}

/**
 * Barra de navegación entre fases de un formulario fragmentado (issue #218):
 * "Atrás" retrocede sin perder datos (el estado vive en el formulario padre,
 * esto solo cambia qué fase se renderiza), "Siguiente" avanza si la fase
 * actual valida. En la última fase el formulario renderiza su propio botón de
 * submit en vez de usar este componente.
 */
export function WizardPhaseNav({
  onBack,
  backLabel = 'Atrás',
  onNext,
  nextLabel = 'Siguiente',
  isLastPhase,
  submitting,
}: WizardPhaseNavProps) {
  if (isLastPhase) return null
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onBack}
        disabled={submitting}
      >
        ← {backLabel}
      </button>
      <button
        type="button"
        className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:not-disabled:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        onClick={onNext}
        disabled={submitting}
      >
        {nextLabel} →
      </button>
    </div>
  )
}
