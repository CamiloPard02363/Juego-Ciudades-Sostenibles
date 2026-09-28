import { useEffect } from 'react'
import type { ReactNode } from 'react'

type ModalProps = {
  onClose: () => void
  children: ReactNode
  maxWidthClassName?: string
  /** Alto máximo antes de que el contenido interno haga scroll (clase `max-h-*`). */
  maxHeightClassName?: string
  /** Borde con el degradado de acento de la app (mismo truco que `WelcomeCard`) en vez del borde plano de siempre. */
  accentBorder?: boolean
  ariaLabel?: string
  ariaModal?: boolean
}

export function Modal({
  onClose,
  children,
  maxWidthClassName = 'max-w-[480px]',
  maxHeightClassName = 'max-h-[85vh]',
  accentBorder = false,
  ariaLabel,
  ariaModal = true,
}: ModalProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm animate-[modal-backdrop-in_0.2s_ease-out]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full ${maxWidthClassName} ${maxHeightClassName} overflow-y-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow)] animate-[modal-panel-in_0.25s_cubic-bezier(0.16,1,0.3,1)] sm:p-8 ${
          accentBorder ? 'border-[3px] border-transparent' : 'border border-border'
        }`}
        style={
          accentBorder
            ? {
                background:
                  'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(120deg, var(--accent-2), var(--accent)) border-box',
              }
            : undefined
        }
        role="dialog"
        aria-label={ariaLabel}
        aria-modal={ariaModal}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
