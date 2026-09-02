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

export type UpdateProfileInput = {
  firstName?: string
  lastName?: string
  middleName?: string | null
  displayName?: string
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

export type CreateUserInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  middleName?: string
  role: string
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
