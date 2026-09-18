import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';

export interface RemoveClassEnrollmentInput {
  classId: string;
  studentUserId: string;
  requestingUserId: string;
}

/**
 * El profesor dueño de la Class expulsa a un estudiante matriculado desde el
 * detalle de su clase (issue #101). Elimina la fila de `ClassEnrollment`; el
 * estudiante deja de ver la Class en su listado de matrículas.
 */
@Injectable()
export class RemoveClassEnrollmentUseCase {
  constructor(@Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository) {}

  async execute(input: RemoveClassEnrollmentInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    if (classEntity.teacherUserId !== input.requestingUserId) {
      throw new ForbiddenException('Solo el profesor dueño de la clase puede expulsar estudiantes.');
    }

    await this.classRepository.unenroll(input.classId, input.studentUserId);
  }
}
