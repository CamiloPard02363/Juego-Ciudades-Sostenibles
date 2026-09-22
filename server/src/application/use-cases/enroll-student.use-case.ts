import { Inject, Injectable } from '@nestjs/common';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  ClassHasNoOrganizationError,
  ClassInactiveError,
  ClassNotFoundError,
  NotAnOrganizationMemberError,
} from '../errors/application.errors.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface EnrollStudentInput {
  classId: string;
  userId: string;
  requestingUserId: string;
}

/**
 * `POST /classes/:classId/enrollments` (issue #133, Frente C, CA-C2):
 * matrícula directa por el profesor, sin pasar por el código de invitación
 * de la clase — pensada para usarse junto a `GET
 * /organizations/:organizationId/students` (Frente C, CA-C1).
 *
 * Autorización — cualquiera de: profesor dueño de esta Class específica,
 * `OrganizationRole.ADMIN` de la organización dueña, o ADMIN global.
 *
 * Reglas de negocio compartidas con `JoinClassUseCase` (CA-B2, CA-E5): la
 * clase debe tener organización, estar activa, y el usuario objetivo debe ser
 * miembro de esa organización — es imposible matricular a alguien que no sea
 * miembro, ni siquiera por este camino sin código.
 */
@Injectable()
export class EnrollStudentUseCase implements UseCase<EnrollStudentInput, ClassDto> {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: EnrollStudentInput): Promise<ClassDto> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    if (!classEntity.organizationId) {
      throw new ClassHasNoOrganizationError(classEntity.id);
    }

    await this.assertAuthorized(classEntity.teacherUserId, classEntity.organizationId, input.requestingUserId);

    if (!classEntity.isActive) {
      throw new ClassInactiveError();
    }

    // CA-B2: imposible matricular a alguien que no sea miembro de la
    // organización dueña de la clase, ni siquiera por este camino sin código.
    const targetMembership = await this.organizationRepository.findMembership(
      classEntity.organizationId,
      input.userId,
    );
    if (!targetMembership) {
      const organization = await this.organizationRepository.findById(classEntity.organizationId);
      throw new NotAnOrganizationMemberError(organization?.name ?? classEntity.organizationId);
    }

    const enrollment = ClassEnrollment.create({
      id: this.idGenerator.generate(),
      classId: classEntity.id,
      userId: input.userId,
    });

    await this.classRepository.enroll(enrollment);

    return toClassDto(classEntity);
  }

  private async assertAuthorized(
    teacherUserId: string,
    organizationId: string,
    requestingUserId: string,
  ): Promise<void> {
    if (requestingUserId === teacherUserId) return;

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);
    if (isPlatformAdmin) return;

    const membership = await this.organizationRepository.findMembership(
      organizationId,
      requestingUserId,
    );
    if (membership?.isAdmin()) return;

    throw new ForbiddenActionError('matricular estudiantes en esta clase');
  }
}
