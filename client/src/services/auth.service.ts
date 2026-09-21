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
  /** ISO "YYYY-MM-DD" — decide el Modo Kids (ver utils/kidsMode.ts), nunca opcional en el formulario. */
  birthDate: string
}

export type UpdateProfileInput = {
  firstName?: string
  lastName?: string
  middleName?: string | null
  displayName?: string
  /** ISO "YYYY-MM-DD". */
  birthDate?: string
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
  birthDate: string | null
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
      birthDate: input.birthDate,
    },
  })
}

export type RefreshResponse = {
  accessToken: string
}

/**
 * POST /auth/refresh — canjea el refresh token (cookie httpOnly, enviada
 * automáticamente por el navegador) por un access token nuevo. Nunca se le
 * pasa `token`: no es una petición autenticada con Bearer, así que un 401
 * aquí no debe disparar el mecanismo de reintento de `request()`.
 */
export function refreshAccessToken(): Promise<RefreshResponse> {
  return request<RefreshResponse>('/auth/refresh', { method: 'POST' })
}

/** POST /auth/logout — revoca el refresh token en servidor y limpia la cookie. */
export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' })
}

/** GET /users/me — usuario dueño del token; sirve para restaurar la sesión. */
export function getProfile(
  token: string,
  signal?: AbortSignal,
): Promise<AuthUser> {
  return request<AuthUser>('/users/me', { token, signal })
}

export type CreateUserInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  middleName?: string
  role: string
  /** ISO "YYYY-MM-DD" — opcional; permite segmentar por Modo Kids a un STUDENT dado de alta a mano. */
  birthDate?: string
}

export type ListUsersParams = {
  page?: number
  pageSize?: number
  role?: string
  isActive?: boolean
}

export type PaginatedUsers = {
  items: AuthUser[]
  total: number
  page: number
  pageSize: number
}

/** POST /users — crea un usuario con rol elegido. Solo accesible para ADMIN. */
export function createUser(token: string, input: CreateUserInput): Promise<AuthUser> {
  return request<AuthUser>('/users', {
    method: 'POST',
    token,
    body: {
      email: input.email.trim().toLowerCase(),
      plainPassword: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      middleName: input.middleName?.trim() || undefined,
      role: input.role,
      birthDate: input.birthDate || undefined,
    },
  })
}

/** GET /users — listado paginado, solo accesible para ADMIN. */
export function listUsers(
  token: string,
  params: ListUsersParams = {},
): Promise<PaginatedUsers> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.role) query.set('role', params.role)
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive))

  const queryString = query.toString()
  return request<PaginatedUsers>(`/users${queryString ? `?${queryString}` : ''}`, {
    token,
  })
}

/** PATCH /users/me/profile — actualiza los datos editables del perfil propio. */
export function updateProfile(
  token: string,
  input: UpdateProfileInput,
): Promise<AuthUser> {
  return request<AuthUser>('/users/me/profile', {
    method: 'PATCH',
    token,
    body: input,
  })
}

/**
 * DELETE /users/me — borra la propia cuenta de forma definitiva (no una
 * desactivación reversible como `deactivateUser`). Exige la contraseña
 * actual como confirmación. Responde 204 sin cuerpo.
 */
export function deleteMyAccount(token: string, currentPlainPassword: string): Promise<void> {
  return request<void>('/users/me', {
    method: 'DELETE',
    token,
    body: { currentPlainPassword },
  })
}

/** PATCH /users/:id/deactivate — desactiva un usuario. Solo ADMIN global. Responde 204 sin cuerpo. */
export function deactivateUser(token: string, userId: string): Promise<void> {
  return request<void>(`/users/${userId}/deactivate`, {
    method: 'PATCH',
    token,
  })
}

/** PATCH /users/:id/reactivate — reactiva un usuario previamente desactivado. Solo ADMIN global. Responde 204 sin cuerpo. */
export function reactivateUser(token: string, userId: string): Promise<void> {
  return request<void>(`/users/${userId}/reactivate`, {
    method: 'PATCH',
    token,
  })
}

/** PATCH /users/:id/role — cambia el rol global de un usuario. Solo ADMIN global. */
export function updateUserRole(
  token: string,
  userId: string,
  role: string,
): Promise<AuthUser> {
  return request<AuthUser>(`/users/${userId}/role`, {
    method: 'PATCH',
    token,
    body: { newRole: role },
  })
}
