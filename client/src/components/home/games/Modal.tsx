import { useEffect } from 'react'
import type { ReactNode } from 'react'

type ModalProps = {
  onClose: () => void
  children: ReactNode
  maxWidthClassName?: string
}

export function Modal({ onClose, children, maxWidthClassName = 'max-w-[480px]' }: ModalProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full ${maxWidthClassName} max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] sm:p-8`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
