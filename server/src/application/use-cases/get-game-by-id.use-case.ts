import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { GameAuthorizationService } from '../services/game-authorization.service.js';
import { ClassEnrollmentGameVisibilityService } from '../services/class-enrollment-game-visibility.service.js';

export interface GetGameByIdInput {
  gameId: string;
  requestingUserId: string;
}

@Injectable()
export class GetGameByIdUseCase implements UseCase<GetGameByIdInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameAuthorization: GameAuthorizationService,
    private readonly classEnrollmentGameVisibility: ClassEnrollmentGameVisibilityService,
  ) {}

  async execute(input: GetGameByIdInput): Promise<GameDetailDto> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    // Un DRAFT solo lo ve su creador, un admin, o un estudiante matriculado
    // (vía ClassEnrollment) en una Class que contiene el juego (issue #101,
    // punto 2). PUBLISHED lo ve cualquiera. FLAGGED/REMOVED tampoco son
    // públicos, mismo criterio que DRAFT.
    if (!game.status.isPublished()) {
      const canManage = await this.gameAuthorization.canManage(game, input.requestingUserId);
      const canViewAsEnrolledStudent = canManage
        ? false
        : await this.classEnrollmentGameVisibility.isEnrolledInAClassContainingGame(
            game.id,
            input.requestingUserId,
          );

      if (!canManage && !canViewAsEnrolledStudent) {
        throw new ForbiddenActionError('ver este juego');
      }
    }

    return toGameDetailDto(game);
  }
}
