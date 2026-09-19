import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';

export interface RemoveClassEnrollmentInput {
  classId: string;
  studentUserId: string;
  requestingUserId: string;
}

/**
 * Expulsa a un estudiante matriculado de una Class (issue #101, ampliado en
 * #106). Puede hacerlo:
 * - el profesor dueño de la clase, siempre.
 * - un `OrganizationRole.ADMIN` de la organización dueña de la clase
 *   (`Class.organizationId`), para cualquier clase de esa organización.
 *
 * Si la clase no tiene `organizationId` (profesor particular, sin
 * organización asociada), solo el profesor dueño puede expulsar — no se
 * intenta resolver membresía de organización en ese caso, para no lanzar un
 * error de "organización no encontrada" que no aplica.
 */
@Injectable()
export class RemoveClassEnrollmentUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(input: RemoveClassEnrollmentInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const isOwner = classEntity.teacherUserId === input.requestingUserId;

    if (!isOwner) {
      const isOrgAdmin =
        classEntity.organizationId !== null &&
        (await this.isOrganizationAdmin(classEntity.organizationId, input.requestingUserId));

      if (!isOrgAdmin) {
        throw new ForbiddenException(
          'Solo el profesor dueño de la clase o un administrador de su organización pueden expulsar estudiantes.',
        );
      }
    }

    await this.classRepository.unenroll(input.classId, input.studentUserId);
  }

  private async isOrganizationAdmin(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.organizationRepository.findMembership(organizationId, userId);
    return membership?.isAdmin() ?? false;
  }
}
