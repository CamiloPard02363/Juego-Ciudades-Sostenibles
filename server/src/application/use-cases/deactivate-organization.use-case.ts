import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface DeactivateOrganizationInput {
  organizationId: string;
}

/**
 * Desactiva una organización (issue #106, CA2.3). Mismo patrón que
 * `DeactivateUserUseCase`: la autorización de ADMIN global ya la resuelve
 * `RolesGuard` (`@Roles('ADMIN')`) sobre el endpoint HTTP, este use-case solo
 * ejecuta la acción de negocio.
 */
@Injectable()
export class DeactivateOrganizationUseCase
  implements UseCase<DeactivateOrganizationInput, void>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(input: DeactivateOrganizationInput): Promise<void> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    organization.deactivate();
    await this.organizationRepository.save(organization);
  }
}
