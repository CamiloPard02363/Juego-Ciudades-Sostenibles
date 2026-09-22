import type { Organization } from '../../domain/entities/organization.entity.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';

export interface OrganizationResponseDto {
  id: string;
  name: string;
  domain: string | null;
  createdByUserId: string;
  createdAt: Date;
  isActive: boolean;
}

export interface OrganizationWithMyRoleDto extends OrganizationResponseDto {
  /** Rol del usuario autenticado dentro de esta organización. */
  myOrgRole: string;
  joinedAt: Date;
  /**
   * Solo se llena cuando el usuario autenticado es `OrganizationRole.ADMIN`
   * de esta organización (o ADMIN global) — issue #133, CA-A3. Un
   * STUDENT/TEACHER miembro no debe poder ver el código de invitación de la
   * organización a la que pertenece.
   */
  inviteCode?: string;
}

export interface OrganizationMemberDto {
  organizationId: string;
  userId: string;
  orgRole: string;
  joinedAt: Date;
  /** Se llena cuando el listado resuelve los datos del usuario. */
  displayName?: string;
  email?: string;
}

export function toOrganizationResponseDto(
  organization: Organization,
): OrganizationResponseDto {
  return {
    id: organization.id,
    name: organization.name,
    domain: organization.domain?.getValue() ?? null,
    createdByUserId: organization.createdByUserId,
    createdAt: organization.createdAt,
    isActive: organization.isActive,
  };
}

export function toOrganizationWithMyRoleDto(
  organization: Organization,
  membership: OrganizationMembership,
  options?: { isPlatformAdmin?: boolean },
): OrganizationWithMyRoleDto {
  const canSeeInviteCode = membership.isAdmin() || (options?.isPlatformAdmin ?? false);

  return {
    ...toOrganizationResponseDto(organization),
    myOrgRole: membership.orgRole.getName(),
    joinedAt: membership.joinedAt,
    ...(canSeeInviteCode ? { inviteCode: organization.inviteCode } : {}),
  };
}

export function toOrganizationMemberDto(
  membership: OrganizationMembership,
): OrganizationMemberDto {
  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    orgRole: membership.orgRole.getName(),
    joinedAt: membership.joinedAt,
  };
}
