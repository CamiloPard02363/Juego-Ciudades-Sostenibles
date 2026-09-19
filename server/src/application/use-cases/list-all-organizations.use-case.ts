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
  /** Substring case-insensitive contra nombre o dominio (issue #106, CA2.2). */
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListAllOrganizationsOutput {
  items: OrganizationResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Query sin filtro de pertenencia: devuelve TODAS las organizaciones, con
 * paginación, `search` e `isActive` (issue #106, CA2.2 — mismo contrato que
 * `ListUsersUseCase`).
 *
 * La autorización de ADMIN global ya no se resuelve acá — la aplica
 * `RolesGuard` (`@Roles('ADMIN')`) sobre el endpoint HTTP antes de llegar a
 * este use-case (issue #101, reemplaza al chequeo inline con
 * `RequesterAdminResolver` que vivía aquí).
 */
@Injectable()
export class ListAllOrganizationsUseCase
  implements UseCase<ListAllOrganizationsInput, ListAllOrganizationsOutput>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(input: ListAllOrganizationsInput): Promise<ListAllOrganizationsOutput> {
    const result = await this.organizationRepository.findAll({
      search: input.search,
      isActive: input.isActive,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });

    return {
      items: result.items.map(toOrganizationResponseDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
