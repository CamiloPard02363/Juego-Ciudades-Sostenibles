import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as authService from '../services/auth.service'
import type { AuthUser, LoginCredentials, RegisterInput } from '../services/auth.service'
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
  signUp: (input: RegisterInput) => Promise<void>
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

  const signUp = useCallback(async (input: RegisterInput) => {
    await authService.registerUser(input)
    // El registro no autentica: se encadena un login con las mismas
    // credenciales para entrar directo al dashboard.
    const { accessToken, user: profile } = await authService.login({
      email: input.email,
      password: input.password,
    })
    setStoredToken(accessToken)
    setToken(accessToken)
    setUser(profile)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(() => {
    // JWT es sin estado: cerrar sesión es solo descartar el token local.
    clearStoredToken()
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, status, signIn, signUp, signOut }}>
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
