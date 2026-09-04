import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface PublishGameInput {
  gameId: string;
  requestingUserId: string;
}

@Injectable()
export class PublishGameUseCase implements UseCase<PublishGameInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: PublishGameInput): Promise<GameDetailDto> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!game.canBeManagedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('publicar este juego');
    }

    game.publish();
    await this.gameRepository.save(game);

    return toGameDetailDto(game);
  }
}
