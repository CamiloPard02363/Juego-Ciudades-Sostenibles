import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ClassNotFoundError, GameNotFoundError } from '../errors/application.errors.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';

export interface SetClassGameArchivedInput {
  classId: string;
  gameId: string;
  isArchived: boolean;
  requestingUserId: string;
}

/**
 * Archivar/desarchivar un juego de la clase (issue #226, "Juegos de la
 * clase"). Mismo eje de autorización que `RemoveGameFromClassUseCase` — el
 * admin tiene control total — pero es una operación reversible, a diferencia
 * de quitar el juego de la clase (que borra el vínculo).
 */
@Injectable()
export class SetClassGameArchivedUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    private readonly classAccessResolver: ClassAccessResolver,
  ) {}

  async execute(input: SetClassGameArchivedInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenException('No tiene permisos para archivar juegos de esta clase.');
    }

    const classGame = await this.classRepository.findClassGame(input.classId, input.gameId);
    if (!classGame) {
      throw new GameNotFoundError(input.gameId);
    }

    await this.classRepository.setClassGameArchived(input.classId, input.gameId, input.isArchived);
  }
}
