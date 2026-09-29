import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { ApiError } from '../utils/http'

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

type GoogleCredentialResponse = { credential: string }

// google.accounts.id no tiene tipos oficiales instalados en el proyecto; se
// declara el subconjunto mínimo que este hook usa, en vez de sumar el
// paquete @types/google.accounts solo por esto.
type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
      }) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`)
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', () => resolve(), { once: true }))
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de Google.'))
    document.head.appendChild(script)
  })
}

/**
 * Carga Google Identity Services y renderiza el botón "Continuar con
 * Google" dentro del contenedor que exponga `containerRef`. Al completarse,
 * manda el idToken recibido a `POST /auth/google` vía `signInWithGoogle`
 * (issue #197).
 */
export function useGoogleSignIn(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  // Evita renderizar el botón dos veces si el efecto corre de nuevo (ej.
  // Fast Refresh en desarrollo).
  const renderedRef = useRef(false)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      setError(null)
      try {
        await signInWithGoogle(response.credential)
      } catch (submitError) {
        setError(
          submitError instanceof ApiError
            ? submitError.message
            : 'No se pudo iniciar sesión con Google. Intenta de nuevo.',
        )
      }
    },
    [signInWithGoogle],
  )

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    loadGsiScript()
      .then(() => {
        if (cancelled || renderedRef.current || !containerRef.current || !window.google) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        })
        renderedRef.current = true
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el inicio de sesión con Google.')
      })

    return () => {
      cancelled = true
    }
  }, [clientId, containerRef, handleCredential])

  return { error, ready, clientId }
}
