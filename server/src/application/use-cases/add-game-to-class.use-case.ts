import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClassGame } from '../../domain/entities/class-game.entity.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../domain/ports/game.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ClassNotFoundError, GameNotFoundError } from '../errors/application.errors.js';

export interface AddGameToClassInput {
  classId: string;
  gameId: string;
  requestingUserId: string;
}

/**
 * Solo el profesor dueño de la clase puede agregarle juegos — de cualquier
 * materia, no solo de las suyas: la clase es un agrupador de trabajo, no un
 * contenedor de contenido propio (ver Class vs Subject en el issue #80).
 */
@Injectable()
export class AddGameToClassUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: AddGameToClassInput): Promise<void> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }
    if (classEntity.teacherUserId !== input.requestingUserId) {
      throw new ForbiddenException('Solo el profesor dueño de la clase puede agregarle juegos.');
    }

    const game = await this.gameRepository.findById(input.gameId);
    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const classGame = ClassGame.create({
      id: this.idGenerator.generate(),
      classId: input.classId,
      gameId: input.gameId,
    });
    await this.classRepository.addGame(classGame);
  }
}
