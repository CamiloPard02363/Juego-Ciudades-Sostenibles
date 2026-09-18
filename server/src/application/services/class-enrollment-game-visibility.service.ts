import { Inject, Injectable } from '@nestjs/common';
import {
  CLASS_REPOSITORY,
  type ClassRepository,
} from '../../domain/ports/class.repository.port.js';

/**
 * Regla de autorización de detalle de juego en DRAFT (issue #101, punto 2):
 * un estudiante matriculado (vía `ClassEnrollment`) en una Class que contiene
 * el juego puede verlo aunque no sea su creador ni admin. Compartido entre
 * `GetGameByIdUseCase` y `GetGameBySlugUseCase` para no duplicar la consulta.
 */
@Injectable()
export class ClassEnrollmentGameVisibilityService {
  constructor(@Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository) {}

  async isEnrolledInAClassContainingGame(
    gameId: string,
    requestingUserId: string,
  ): Promise<boolean> {
    const classIdsWithGame = await this.classRepository.findClassIdsContainingGame(gameId);
    if (classIdsWithGame.length === 0) {
      return false;
    }

    const enrolledClassIds = await this.classRepository.findClassIdsEnrolledByUserId(
      requestingUserId,
    );

    return classIdsWithGame.some((classId) => enrolledClassIds.includes(classId));
  }
}
