import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error'

type Toast = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<ToastVariant, { border: string; bg: string; icon: ReactNode }> = {
  success: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500',
    icon: <CheckCircle2 size={18} className="shrink-0" />,
  },
  error: {
    border: 'border-danger/40',
    bg: 'bg-danger',
    icon: <XCircle size={18} className="shrink-0" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, variant }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3500)
  }, [])

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant]
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border ${style.border} ${style.bg} px-4 py-3 text-[13.5px] font-medium text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.4)] animate-[fade-in-up_0.25s_ease-out]`}
              role="status"
            >
              {style.icon}
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 opacity-80 hover:opacity-100"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}
