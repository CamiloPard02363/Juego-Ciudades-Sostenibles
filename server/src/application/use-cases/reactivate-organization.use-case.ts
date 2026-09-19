import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ReactivateOrganizationInput {
  organizationId: string;
}

/**
 * Reactiva una organización previamente desactivada (issue #106, CA2.3).
 * Mismo patrón que `ReactivateUserUseCase`: la autorización de ADMIN global ya
 * la resuelve `RolesGuard` (`@Roles('ADMIN')`) sobre el endpoint HTTP.
 */
@Injectable()
export class ReactivateOrganizationUseCase
  implements UseCase<ReactivateOrganizationInput, void>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(input: ReactivateOrganizationInput): Promise<void> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    organization.reactivate();
    await this.organizationRepository.save(organization);
  }
}
