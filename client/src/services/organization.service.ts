import { request } from '../utils/http'

export type Organization = {
  id: string
  name: string
  domain: string | null
  createdByUserId: string
  createdAt: string
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

/** GET /organizations/all — todas las organizaciones de la plataforma. Solo ADMIN global. */
export function listAllOrganizations(token: string): Promise<Organization[]> {
  return request<Organization[]>('/organizations/all', { token })
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
