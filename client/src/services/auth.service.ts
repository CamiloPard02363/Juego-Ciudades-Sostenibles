import { request } from '../utils/http'

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  email: string
  displayName: string
  role: string
}

export type LoginResponse = {
  accessToken: string
  user: AuthUser
}

/** POST /auth/login — valida credenciales y devuelve el token de acceso. */
export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email.trim().toLowerCase(),
      plainPassword: credentials.password,
    },
  })
}

/** GET /users/me — usuario dueño del token; sirve para restaurar la sesión. */
export function getProfile(
  token: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return request<AuthUser>('/users/me', { token, signal })
}
