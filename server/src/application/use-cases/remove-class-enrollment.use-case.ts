import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';

export interface RemoveClassEnrollmentInput {
  classId: string;
  studentUserId: string;
  requestingUserId: string;
}

/**
 * Expulsa a un estudiante matriculado de una Class (issue #101, ampliado en
 * #106 y #226). Autoriza vía `ClassAccessResolver` — mismo criterio "OR entre
 * ejes" que el resto de endpoints de clase: el profesor dueño, un admin de la
 * institución dueña de la clase, o el admin global de la plataforma.
 */
@Injectable()
export class RemoveClassEnrollmentUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    private readonly classAccessResolver: ClassAccessResolver,
  ) {}

  async execute(input: RemoveClassEnrollmentInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenActionError('expulsar estudiantes de esta clase');
    }

    await this.classRepository.unenroll(input.classId, input.studentUserId);
  }
}
