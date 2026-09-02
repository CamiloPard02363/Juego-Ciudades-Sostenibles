import { request } from '../utils/http'

export type LoginCredentials = {
  email: string
  password: string
}

export type RegisterInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  middleName?: string
}

export type AuthUser = {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  displayName: string
  role: string
  avatarUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
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

/** POST /auth/register — crea la cuenta. No autentica: no hay token en la respuesta. */
export function registerUser(input: RegisterInput): Promise<AuthUser> {
  return request<AuthUser>('/auth/register', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      plainPassword: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      middleName: input.middleName?.trim() || undefined,
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
