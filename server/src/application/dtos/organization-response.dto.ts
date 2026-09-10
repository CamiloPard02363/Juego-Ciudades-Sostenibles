import type { Organization } from '../../domain/entities/organization.entity.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';

export interface OrganizationResponseDto {
  id: string;
  name: string;
  domain: string | null;
  createdByUserId: string;
  createdAt: Date;
}

export interface OrganizationWithMyRoleDto extends OrganizationResponseDto {
  /** Rol del usuario autenticado dentro de esta organización. */
  myOrgRole: string;
  joinedAt: Date;
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
  };
}

export function toOrganizationWithMyRoleDto(
  organization: Organization,
  membership: OrganizationMembership,
): OrganizationWithMyRoleDto {
  return {
    ...toOrganizationResponseDto(organization),
    myOrgRole: membership.orgRole.getName(),
    joinedAt: membership.joinedAt,
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
