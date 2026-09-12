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

    return organizations.flatMap((organization) => {
      const membership = membershipByOrgId.get(organization.id);
      return membership ? [toOrganizationWithMyRoleDto(organization, membership)] : [];
    });
  }
}
