import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';

export interface RemoveGameFromClassInput {
  classId: string;
  gameId: string;
  requestingUserId: string;
}

@Injectable()
export class RemoveGameFromClassUseCase {
  constructor(@Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository) {}

  async execute(input: RemoveGameFromClassInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }
    if (classEntity.teacherUserId !== input.requestingUserId) {
      throw new ForbiddenException('Solo el profesor dueño de la clase puede quitarle juegos.');
    }

    await this.classRepository.removeGame(input.classId, input.gameId);
  }
}
