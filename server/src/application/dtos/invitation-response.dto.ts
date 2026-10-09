import type { Invitation } from '../../domain/entities/invitation.entity.js';

/**
 * Respuesta de alta manual de un estudiante (issue #232): `status`
 * distingue los dos caminos del mismo endpoint — `'LINKED'` si el email ya
 * tenía cuenta y se vinculó directo (sin token), `'PENDING'` si se generó una
 * invitación nueva con link.
 */
export interface EnrollOrInviteResultDto {
  status: 'LINKED' | 'PENDING';
  /** Presente solo cuando `status === 'PENDING'`: el admin/profesor lo copia y distribuye manualmente. */
  invitationUrl?: string;
  expiresAt?: Date;
  /** Presente solo cuando `status === 'LINKED'`: el id del usuario ya vinculado. */
  userId?: string;
}

export interface InvitationSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  classId: string | null;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  status: 'PENDING' | 'EXPIRED';
}

export function toInvitationSummaryDto(invitation: Invitation): InvitationSummaryDto {
  return {
    id: invitation.id,
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    organizationId: invitation.organizationId,
    classId: invitation.classId,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    status: invitation.isExpired() ? 'EXPIRED' : 'PENDING',
  };
}

/** Datos públicos para precargar el formulario de "completar registro" sin exponer el link entero. */
export interface InvitationPreviewDto {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  classId: string | null;
}

export function toInvitationPreviewDto(invitation: Invitation): InvitationPreviewDto {
  return {
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    organizationId: invitation.organizationId,
    classId: invitation.classId,
  };
}
