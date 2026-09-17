import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

/**
 * Sin esto, cualquier error no capturado durante el render desmonta todo el
 * árbol de React y deja una pantalla en negro sin router ni botones: nada
 * con qué recuperarse salvo recargar manualmente la URL.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no capturado en la aplicación:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-[22px] text-text-h">Algo salió mal</h1>
          <p className="max-w-[420px] text-[14px] text-text">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            type="button"
            className="rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
