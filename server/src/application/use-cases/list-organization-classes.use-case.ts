import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListOrganizationClassesInput {
  organizationId: string;
  requestingUserId: string;
}

/**
 * `GET /organizations/:organizationId/classes` (issue #226, drill-down de
 * institución, sección "Clases"): lista todas las Class cuya `organizationId`
 * coincide, sin importar qué profesor las dicta.
 *
 * Usa `ClassRepository.findAllByOrganizationId()`, que filtra por
 * `organizationId` a nivel de query SQL (índice `@@index([organizationId])`
 * en `ClassModel`). Antes filtraba en memoria sobre `findAll()` —recorriendo
 * TODAS las Class de la plataforma en cada carga—, lo cual era el cuello de
 * botella principal de performance del drill-down de institución (issue
 * #226, feedback de Manuel: >1s por carga).
 *
 * Autorización — mismo criterio OR-entre-ejes que
 * `ListOrganizationStudentsUseCase`: ADMIN global, ADMIN de esa organización,
 * o un profesor que ya dicta alguna clase de esa organización.
 */
@Injectable()
export class ListOrganizationClassesUseCase
  implements UseCase<ListOrganizationClassesInput, ClassDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListOrganizationClassesInput): Promise<ClassDto[]> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    await this.assertAuthorized(input.organizationId, input.requestingUserId);

    const classes = await this.classRepository.findAllByOrganizationId(input.organizationId);
    return classes.map((classEntity) => toClassDto(classEntity, organization.name));
  }

  private async assertAuthorized(organizationId: string, requestingUserId: string): Promise<void> {
    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);
    if (isPlatformAdmin) return;

    const membership = await this.organizationRepository.findMembership(
      organizationId,
      requestingUserId,
    );
    if (membership?.isAdmin()) return;

    const ownClasses = await this.classRepository.findAllByTeacherUserId(requestingUserId, true);
    const teachesInOrganization = ownClasses.some(
      (classEntity) => classEntity.organizationId === organizationId,
    );
    if (teachesInOrganization) return;

    throw new ForbiddenActionError('listar las clases de esta organización');
  }
}
