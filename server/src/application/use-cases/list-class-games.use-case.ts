import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../domain/ports/game.repository.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { toGameSummaryDto, type GameSummaryDto } from '../dtos/game-response.dto.js';

export interface ListClassGamesInput {
  classId: string;
  requestingUserId: string;
}

@Injectable()
export class ListClassGamesUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(input: ListClassGamesInput): Promise<GameSummaryDto[]> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }
    if (classEntity.teacherUserId !== input.requestingUserId) {
      throw new ForbiddenException('Solo el profesor dueño de la clase puede ver sus juegos.');
    }

    const gameIds = await this.classRepository.findGameIdsByClassId(input.classId);
    const games = await this.gameRepository.findByIds(gameIds);

    return games.map(toGameSummaryDto);
  }
}
