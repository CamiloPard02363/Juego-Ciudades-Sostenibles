import { request } from '../utils/http'
import type { AuthUser } from './auth.service'

export type InviteStudentInput = {
  email: string
  firstName: string
  lastName: string
}

/** Resultado de la alta manual (issue #232): dos caminos posibles del mismo endpoint. */
export type EnrollOrInviteResult = {
  status: 'LINKED' | 'PENDING'
  /** Presente solo cuando `status === 'PENDING'`: copiar y distribuir manualmente (MVP sin email real). */
  invitationUrl?: string
  expiresAt?: string
  userId?: string
}

export type InvitationSummary = {
  id: string
  email: string
  firstName: string
  lastName: string
  organizationId: string
  classId: string | null
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  status: 'PENDING' | 'EXPIRED'
}

/**
 * POST /organizations/:id/invitations — alta manual de un estudiante a la
 * institución (issue #232). Solo ADMIN de esa organización o ADMIN global.
 */
export function inviteStudentToOrganization(
  token: string,
  organizationId: string,
  input: InviteStudentInput,
): Promise<EnrollOrInviteResult> {
  return request<EnrollOrInviteResult>(`/organizations/${organizationId}/invitations`, {
    method: 'POST',
    token,
    body: input,
  })
}

/** GET /organizations/:id/invitations — invitaciones pendientes de la institución. */
export function listOrganizationInvitations(
  token: string,
  organizationId: string,
): Promise<InvitationSummary[]> {
  return request<InvitationSummary[]>(`/organizations/${organizationId}/invitations`, { token })
}

/**
 * POST /classes/:id/invitations — alta manual de un estudiante a la clase
 * (issue #232). Profesor dueño, admin de la institución, o admin global.
 */
export function inviteStudentToClass(
  token: string,
  classId: string,
  input: InviteStudentInput,
): Promise<EnrollOrInviteResult> {
  return request<EnrollOrInviteResult>(`/classes/${classId}/invitations`, {
    method: 'POST',
    token,
    body: input,
  })
}

/** GET /classes/:id/invitations — invitaciones pendientes de la clase. */
export function listClassInvitations(token: string, classId: string): Promise<InvitationSummary[]> {
  return request<InvitationSummary[]>(`/classes/${classId}/invitations`, { token })
}

export type InvitationPreview = {
  email: string
  firstName: string
  lastName: string
  organizationId: string
  classId: string | null
}

/** GET /invitations/:token — público, precarga los datos nominales antes de completar el registro. */
export function getInvitationByToken(token: string): Promise<InvitationPreview> {
  return request<InvitationPreview>(`/invitations/${token}`)
}

export type AcceptInvitationInput = {
  plainPassword: string
  firstName?: string
  lastName?: string
  middleName?: string
  /** ISO "YYYY-MM-DD". */
  birthDate?: string
}

export type AcceptInvitationResponse = {
  accessToken: string
  user: AuthUser
}

/**
 * POST /invitations/:token/accept — público, completa el registro y deja al
 * usuario autenticado (mismo patrón de cookie httpOnly que `/auth/login`).
 */
export function acceptInvitation(
  token: string,
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResponse> {
  return request<AcceptInvitationResponse>(`/invitations/${token}/accept`, {
    method: 'POST',
    body: input,
  })
}
