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

export interface DeactivateClassInput {
  classId: string;
  requestingUserId: string;
}

/**
 * `PATCH /classes/:id/deactivate` (issue #133, Frente E, CA-E2): soft-delete
 * de la clase. Las `ClassEnrollment` existentes no se tocan (CA-E3) — no hay
 * ninguna cascada acá, simplemente esta operación no las toca.
 *
 * Autorización resuelta acá (no vía `RolesGuard`) por el mismo motivo que
 * `RemoveOrganizationMemberUseCase`: es un OR entre tres ejes (profesor
 * dueño, ADMIN de la organización dueña si tiene, ADMIN global).
 */
@Injectable()
export class DeactivateClassUseCase implements UseCase<DeactivateClassInput, void> {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: DeactivateClassInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    await this.assertAuthorized(classEntity.teacherUserId, classEntity.organizationId, input.requestingUserId);

    classEntity.deactivate();
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

    throw new ForbiddenActionError('desactivar esta clase');
  }
}
