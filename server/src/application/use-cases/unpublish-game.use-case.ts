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

export interface UnpublishGameInput {
  gameId: string;
  requestingUserId: string;
}

@Injectable()
export class UnpublishGameUseCase implements UseCase<UnpublishGameInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameAuthorization: GameAuthorizationService,
  ) {}

  async execute(input: UnpublishGameInput): Promise<GameDetailDto> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const canManage = await this.gameAuthorization.canManage(game, input.requestingUserId);
    if (!canManage) {
      throw new ForbiddenActionError('despublicar este juego');
    }

    game.unpublish();
    await this.gameRepository.save(game);

    return toGameDetailDto(game);
  }
}
