import { request } from '../utils/http'

export type Organization = {
  id: string
  name: string
  domain: string | null
  createdByUserId: string
  createdAt: string
  isActive: boolean
}

export type OrganizationWithMyRole = Organization & {
  /** Rol del usuario autenticado dentro de esta organización (ADMIN/TEACHER/STUDENT). */
  myOrgRole: string
  joinedAt: string
}

export type OrganizationMember = {
  organizationId: string
  userId: string
  orgRole: string
  joinedAt: string
  displayName?: string
  email?: string
}

export type CreateOrganizationInput = {
  name: string
  domain?: string | null
}

/** POST /organizations — crea la organización; el usuario queda ADMIN automático. */
export function createOrganization(
  token: string,
  input: CreateOrganizationInput,
): Promise<Organization> {
  return request<Organization>('/organizations', {
    method: 'POST',
    token,
    body: input,
  })
}

/** GET /organizations/mine — organizaciones del usuario autenticado, con su rol en cada una. */
export function listMyOrganizations(token: string): Promise<OrganizationWithMyRole[]> {
  return request<OrganizationWithMyRole[]>('/organizations/mine', { token })
}

export type ListOrganizationsParams = {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export type PaginatedOrganizations = {
  items: Organization[]
  total: number
  page: number
  pageSize: number
}

/**
 * GET /organizations/all — todas las organizaciones de la plataforma. Solo
 * ADMIN global. Paginado, con búsqueda y filtro de estado (issue #106/#108,
 * mismo shape de convención que `listUsers` en `auth.service.ts`).
 */
export function listAllOrganizations(
  token: string,
  params: ListOrganizationsParams = {},
): Promise<PaginatedOrganizations> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive))

  const queryString = query.toString()
  return request<PaginatedOrganizations>(`/organizations/all${queryString ? `?${queryString}` : ''}`, {
    token,
  })
}

/** GET /organizations/:id/members — miembros con su orgRole. Solo ADMIN de esa org o ADMIN global. */
export function listOrganizationMembers(
  token: string,
  organizationId: string,
): Promise<OrganizationMember[]> {
  return request<OrganizationMember[]>(
    `/organizations/${organizationId}/members`,
    { token },
  )
}

/**
 * Única fuente de verdad de los roles de organización en el cliente. El
 * servidor tiene su propia copia (DTO `@IsIn` + enum de Prisma) — cruzar el
 * límite cliente/servidor es tolerable, pero dentro del cliente todo lo que
 * necesite este literal debería derivarlo de aquí.
 */
export const ORGANIZATION_ROLES = ['ADMIN', 'TEACHER', 'STUDENT'] as const

export type OrganizationRoleValue = (typeof ORGANIZATION_ROLES)[number]

export type AddOrganizationMemberInput = {
  email: string
  orgRole: OrganizationRoleValue
}

/**
 * POST /organizations/:id/members — agrega un usuario ya registrado (con
 * cualquier dominio de correo) como miembro de la organización. Solo ADMIN de
 * esa org o ADMIN global.
 */
export function addOrganizationMember(
  token: string,
  organizationId: string,
  input: AddOrganizationMemberInput,
): Promise<OrganizationMember> {
  return request<OrganizationMember>(
    `/organizations/${organizationId}/members`,
    { method: 'POST', token, body: input },
  )
}

/**
 * DELETE /organizations/:organizationId/members/:userId — remueve la
 * membresía de un usuario. Solo ADMIN de esa organización o ADMIN global
 * (issue #106/#108, CA3.1). Responde 204 sin cuerpo.
 */
export function removeOrganizationMember(
  token: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  return request<void>(`/organizations/${organizationId}/members/${userId}`, {
    method: 'DELETE',
    token,
  })
}

/** PATCH /organizations/:id/deactivate — solo ADMIN global. Responde 204 sin cuerpo. */
export function deactivateOrganization(token: string, id: string): Promise<void> {
  return request<void>(`/organizations/${id}/deactivate`, {
    method: 'PATCH',
    token,
  })
}

/** PATCH /organizations/:id/reactivate — solo ADMIN global. Responde 204 sin cuerpo. */
export function reactivateOrganization(token: string, id: string): Promise<void> {
  return request<void>(`/organizations/${id}/reactivate`, {
    method: 'PATCH',
    token,
  })
}
