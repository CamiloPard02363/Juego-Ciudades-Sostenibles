import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as authService from '../services/auth.service'
import type { AuthUser, LoginCredentials } from '../services/auth.service'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../utils/storage'

/** `checking` mientras se valida el token guardado al arrancar la app. */
type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  status: AuthStatus
  signIn: (credentials: LoginCredentials) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')

  // Al montar, se rehidrata la sesión desde el token guardado.
  useEffect(() => {
    const storedToken = getStoredToken()
    if (!storedToken) {
      setStatus('anonymous')
      return
    }

    const controller = new AbortController()

    authService
      .getProfile(storedToken, controller.signal)
      .then((profile) => {
        setUser(profile)
        setToken(storedToken)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Token expirado o inválido: se descarta y se vuelve al login.
        clearStoredToken()
        setStatus('anonymous')
      })

    return () => controller.abort()
  }, [])

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const { accessToken, user: profile } = await authService.login(credentials)
    setStoredToken(accessToken)
    setToken(accessToken)
    setUser(profile)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(() => {
    // La sesión local se cierra de inmediato; el aviso al servidor es
    // best-effort y no debe bloquear ni fallar la salida.
    const currentToken = token
    clearStoredToken()
    setToken(null)
    setUser(null)
    setStatus('anonymous')
    if (currentToken) void authService.logout(currentToken).catch(() => {})
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, status, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return context
}
