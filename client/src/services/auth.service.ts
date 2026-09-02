import { request } from '../utils/http'

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
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
      password: credentials.password,
    },
  })
}

/** GET /auth/profile — usuario dueño del token; sirve para restaurar la sesión. */
export function getProfile(
  token: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return request<AuthUser>('/auth/profile', { token, signal })
}

/** POST /auth/logout — invalida el token en el servidor. */
export function logout(token: string): Promise<null> {
  return request<null>('/auth/logout', { method: 'POST', token })
}
