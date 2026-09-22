import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';
import { resolveOrganizationNamesByClass } from './shared/resolve-organization-names.js';

/** Clases donde el usuario autenticado está matriculado como estudiante (issue #101). */
@Injectable()
export class ListMyEnrollmentsUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * `includeInactive` (issue #133, CA-E4): por default solo trae clases
   * activas; el estudiante puede pedir también las desactivadas.
   */
  async execute(requestingUserId: string, includeInactive = false): Promise<ClassDto[]> {
    const classes = await this.classRepository.findAllClassesEnrolledByUserId(
      requestingUserId,
      includeInactive,
    );
    const namesByOrgId = await resolveOrganizationNamesByClass(
      classes,
      this.organizationRepository,
    );
    return classes.map((classEntity) =>
      toClassDto(classEntity, namesByOrgId.get(classEntity.organizationId ?? '') ?? null),
    );
  }
}
