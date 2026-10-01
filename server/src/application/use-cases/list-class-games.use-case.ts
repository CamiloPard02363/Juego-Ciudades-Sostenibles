import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../domain/ports/game.repository.port.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { toGameSummaryDto } from '../dtos/game-response.dto.js';
import { toClassGameSummaryDto, type ClassGameSummaryDto } from '../dtos/class-game-summary.dto.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';

export interface ListClassGamesInput {
  classId: string;
  requestingUserId: string;
}

/**
 * Autorización ampliada en el issue #226: antes solo el profesor dueño podía
 * ver los juegos de su clase; ahora un admin de la institución dueña (o el
 * admin global) también necesita verlos para la pestaña "Juegos de la clase"
 * del drill-down — mismo criterio que `ClassAccessResolver` en el resto del
 * dashboard de métricas.
 */
@Injectable()
export class ListClassGamesUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly classAccessResolver: ClassAccessResolver,
  ) {}

  async execute(input: ListClassGamesInput): Promise<ClassGameSummaryDto[]> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenException('No tiene permisos para ver los juegos de esta clase.');
    }

    const classGames = await this.classRepository.findClassGamesByClassId(input.classId);
    const games = await this.gameRepository.findByIds(classGames.map((cg) => cg.gameId));
    const gameById = new Map(games.map((game) => [game.id, toGameSummaryDto(game)]));

    return classGames
      .map((classGame) => {
        const gameSummary = gameById.get(classGame.gameId);
        return gameSummary ? toClassGameSummaryDto(classGame, gameSummary) : null;
      })
      .filter((dto): dto is ClassGameSummaryDto => dto !== null);
  }
}
