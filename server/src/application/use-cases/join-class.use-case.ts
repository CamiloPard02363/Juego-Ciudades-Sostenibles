import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  ClassInactiveError,
  ClassNotFoundError,
  NotAnOrganizationMemberError,
} from '../errors/application.errors.js';
import { toClassDto, type ClassDto } from '../dtos/class-response.dto.js';

export interface JoinClassInput {
  inviteCode: string;
  requestingUserId: string;
}

/**
 * `POST /classes/join`: un estudiante se matricula en una Class por su
 * `inviteCode` estático (issue #101, análogo en espíritu a
 * `resolveRoomCode`/`JoinByCodeModal` para salas de juego, pero HTTP simple
 * en vez de socket porque no hay estado de sala en memoria que resolver).
 *
 * Idempotente por diseño: `ClassRepository.enroll` hace upsert sobre
 * `(classId, userId)`, así que unirse dos veces con el mismo código no
 * duplica la matrícula ni falla — devuelve la Class igual.
 *
 * Sin restricción de rol: cualquier usuario autenticado puede matricularse
 * (el "estudiante" es un rol conceptual de la matrícula, no un requisito de
 * `Role` global — un TEACHER también podría unirse a la clase de otro
 * profesor como forma de colaboración, y el issue no pide bloquear ese caso).
 */
@Injectable()
export class JoinClassUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: JoinClassInput): Promise<ClassDto> {
    const normalizedCode = input.inviteCode.trim().toUpperCase();
    const classEntity = await this.classRepository.findByInviteCode(normalizedCode);

    if (!classEntity) {
      throw new ClassNotFoundError(normalizedCode);
    }

    // Clase desactivada (issue #133, CA-E5): no admite nuevas matrículas.
    if (!classEntity.isActive) {
      throw new ClassInactiveError();
    }

    // Organización desactivada: no admite nuevas matrículas (issue #106,
    // CA2.3). Clases sin organización (profesor particular) no aplican.
    if (classEntity.organizationId) {
      const organization = await this.organizationRepository.findById(
        classEntity.organizationId,
      );
      if (organization && !organization.isActive) {
        throw new ForbiddenException(
          'La organización de esta clase está desactivada y no admite nuevas matrículas.',
        );
      }

      // Issue #133, Frente B (CA-B1): el estudiante debe pertenecer a la
      // organización dueña de la clase ANTES de crear el enrollment. Se
      // resuelve acá, no antes del chequeo de organización desactivada,
      // porque ambos errores son válidos y este es el orden que documenta
      // el issue ("después del chequeo de isActive de organización, antes
      // de crear el enrollment").
      const membership = await this.organizationRepository.findMembership(
        classEntity.organizationId,
        input.requestingUserId,
      );
      if (!membership) {
        throw new NotAnOrganizationMemberError(classEntity.organizationId);
      }
    }

    const enrollment = ClassEnrollment.create({
      id: this.idGenerator.generate(),
      classId: classEntity.id,
      userId: input.requestingUserId,
    });

    await this.classRepository.enroll(enrollment);

    return toClassDto(classEntity);
  }
}
