import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ReactivateClassInput {
  classId: string;
  requestingUserId: string;
}

/**
 * `PATCH /classes/:id/reactivate` (issue #133, Frente E, CA-E2). Mismo
 * criterio de autorización que `DeactivateClassUseCase`. Restaura la clase a
 * la vista de "activas" sin ningún efecto adicional sobre las matrículas
 * (CA-E3).
 */
@Injectable()
export class ReactivateClassUseCase implements UseCase<ReactivateClassInput, void> {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ReactivateClassInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    await this.assertAuthorized(classEntity.teacherUserId, classEntity.organizationId, input.requestingUserId);

    classEntity.reactivate();
    await this.classRepository.save(classEntity);
  }

  private async assertAuthorized(
    teacherUserId: string,
    organizationId: string | null,
    requestingUserId: string,
  ): Promise<void> {
    if (requestingUserId === teacherUserId) return;

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);
    if (isPlatformAdmin) return;

    if (organizationId) {
      const membership = await this.organizationRepository.findMembership(
        organizationId,
        requestingUserId,
      );
      if (membership?.isAdmin()) return;
    }

    throw new ForbiddenActionError('reactivar esta clase');
  }
}
