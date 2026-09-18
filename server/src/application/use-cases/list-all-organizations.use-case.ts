import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  toOrganizationResponseDto,
  type OrganizationResponseDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ListAllOrganizationsInput {
  requestingUserId: string;
}

/**
 * Query sin filtro de pertenencia: devuelve TODAS las organizaciones.
 *
 * La autorización de ADMIN global ya no se resuelve acá — la aplica
 * `RolesGuard` (`@Roles('ADMIN')`) sobre el endpoint HTTP antes de llegar a
 * este use-case (issue #101, reemplaza al chequeo inline con
 * `RequesterAdminResolver` que vivía aquí).
 */
@Injectable()
export class ListAllOrganizationsUseCase
  implements UseCase<ListAllOrganizationsInput, OrganizationResponseDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(_input: ListAllOrganizationsInput): Promise<OrganizationResponseDto[]> {
    const organizations = await this.organizationRepository.findAll();
    return organizations.map(toOrganizationResponseDto);
  }
}
