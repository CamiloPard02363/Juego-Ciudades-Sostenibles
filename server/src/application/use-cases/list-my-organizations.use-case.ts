import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  toOrganizationWithMyRoleDto,
  type OrganizationWithMyRoleDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListMyOrganizationsInput {
  requestingUserId: string;
}

/** Lista todas las organizaciones que integra el usuario autenticado, con su rol en cada una. */
@Injectable()
export class ListMyOrganizationsUseCase
  implements UseCase<ListMyOrganizationsInput, OrganizationWithMyRoleDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListMyOrganizationsInput): Promise<OrganizationWithMyRoleDto[]> {
    const memberships = await this.organizationRepository.findMembershipsByUserId(
      input.requestingUserId,
    );

    if (memberships.length === 0) {
      return [];
    }

    const organizations = await this.organizationRepository.findAllByUserId(
      input.requestingUserId,
    );
    const membershipByOrgId = new Map(
      memberships.map((membership) => [membership.organizationId, membership]),
    );

    // Issue #133, CA-A3: el inviteCode solo se expone si el usuario es
    // OrganizationRole.ADMIN de esa organización específica o ADMIN global —
    // resuelto una sola vez acá en vez de por organización porque el eje de
    // plataforma es el mismo para todas las filas.
    const isPlatformAdmin = await this.requesterAdminResolver.resolve(
      input.requestingUserId,
    );

    return organizations.flatMap((organization) => {
      const membership = membershipByOrgId.get(organization.id);
      return membership
        ? [toOrganizationWithMyRoleDto(organization, membership, { isPlatformAdmin })]
        : [];
    });
  }
}
