import { Inject, Injectable } from '@nestjs/common';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
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
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: JoinClassInput): Promise<ClassDto> {
    const normalizedCode = input.inviteCode.trim().toUpperCase();
    const classEntity = await this.classRepository.findByInviteCode(normalizedCode);

    if (!classEntity) {
      throw new ClassNotFoundError(normalizedCode);
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
