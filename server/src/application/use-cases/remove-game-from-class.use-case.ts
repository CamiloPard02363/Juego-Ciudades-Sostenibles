import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';

export interface RemoveGameFromClassInput {
  classId: string;
  gameId: string;
  requestingUserId: string;
}

/**
 * Autorización ampliada en el issue #226 ("el admin tiene control total"
 * sobre los juegos de la clase): ya no es solo el profesor dueño, también el
 * admin de la institución dueña de la clase o el admin global.
 */
@Injectable()
export class RemoveGameFromClassUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    private readonly classAccessResolver: ClassAccessResolver,
  ) {}

  async execute(input: RemoveGameFromClassInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenException('No tiene permisos para quitarle juegos a esta clase.');
    }

    await this.classRepository.removeGame(input.classId, input.gameId);
  }
}
