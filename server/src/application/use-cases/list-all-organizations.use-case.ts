import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  toOrganizationResponseDto,
  type OrganizationResponseDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListAllOrganizationsInput {
  requestingUserId: string;
}

/**
 * Query sin filtro de pertenencia: devuelve TODAS las organizaciones.
 * La autorización es simplemente `role.isAdmin()` global resuelto contra BD —
 * no hay modelo de datos adicional para este permiso (decisión del issue #29).
 */
@Injectable()
export class ListAllOrganizationsUseCase
  implements UseCase<ListAllOrganizationsInput, OrganizationResponseDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListAllOrganizationsInput): Promise<OrganizationResponseDto[]> {
    const isPlatformAdmin = await this.requesterAdminResolver.resolve(
      input.requestingUserId,
    );

    if (!isPlatformAdmin) {
      throw new ForbiddenActionError('ver todas las organizaciones');
    }

    const organizations = await this.organizationRepository.findAll();
    return organizations.map(toOrganizationResponseDto);
  }
}
