import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as authService from '../services/auth.service'
import type {
  AuthUser,
  LoginCredentials,
  RegisterInput,
  UpdateProfileInput,
} from '../services/auth.service'
import { setRefreshHandler, setUnauthorizedHandler } from '../utils/http'

/** `checking` mientras se intenta renovar la sesión al arrancar la app. */
type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  status: AuthStatus
  signIn: (credentials: LoginCredentials) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => void
  updateProfile: (input: UpdateProfileInput) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')
  // El access token vive solo en memoria (dura 15 min, no vale la pena
  // persistirlo); un ref evita que `refreshAccessToken` capture un `token`
  // obsoleto en closures viejas de `request()`.
  const tokenRef = useRef<string | null>(null)

  const applySession = useCallback((accessToken: string, profile: AuthUser) => {
    tokenRef.current = accessToken
    setToken(accessToken)
    setUser(profile)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(() => {
    tokenRef.current = null
    setToken(null)
    setUser(null)
    setStatus('anonymous')
    // Best-effort: revoca el refresh token en servidor. Si falla (red caída,
    // ya revocado), la sesión local ya quedó cerrada de todos modos.
    authService.logout().catch(() => {})
  }, [])

  // request() usa esto para renovar el access token cuando vence a mitad de
  // sesión, y para la rehidratación al montar (ver efecto de abajo).
  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const { accessToken } = await authService.refreshAccessToken()
      tokenRef.current = accessToken
      setToken(accessToken)
      return accessToken
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    setRefreshHandler(refreshSession)
    return () => setRefreshHandler(null)
  }, [refreshSession])

  // Cualquier petición autenticada que agote los reintentos de refresh
  // cierra la sesión sola, sin que cada componente lo maneje por su cuenta.
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Al montar: no hay nada persistido localmente que revisar (el refresh
  // token vive en una cookie httpOnly que este código ni siquiera puede
  // leer), así que la sesión se intenta renovar directo contra el backend.
  useEffect(() => {
    let cancelled = false

    refreshSession().then((accessToken) => {
      if (cancelled) return
      if (!accessToken) {
        setStatus('anonymous')
        return
      }
      authService
        .getProfile(accessToken)
        .then((profile) => {
          if (!cancelled) applySession(accessToken, profile)
        })
        .catch(() => {
          if (!cancelled) setStatus('anonymous')
        })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      const { accessToken, user: profile } = await authService.login(credentials)
      applySession(accessToken, profile)
    },
    [applySession],
  )

  const signUp = useCallback(
    async (input: RegisterInput) => {
      await authService.registerUser(input)
      // El registro no autentica: se encadena un login con las mismas
      // credenciales para entrar directo al dashboard.
      const { accessToken, user: profile } = await authService.login({
        email: input.email,
        password: input.password,
      })
      applySession(accessToken, profile)
    },
    [applySession],
  )

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    if (!tokenRef.current) throw new Error('No hay una sesión activa.')
    const profile = await authService.updateProfile(tokenRef.current, input)
    setUser(profile)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, token, status, signIn, signUp, signOut, updateProfile }}
    >
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
