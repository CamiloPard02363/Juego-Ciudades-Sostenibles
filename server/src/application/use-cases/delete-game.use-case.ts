import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { GameAuthorizationService } from '../services/game-authorization.service.js';

export interface DeleteGameInput {
  gameId: string;
  requestingUserId: string;
}

/**
 * Marca el juego como REMOVED (borrado lógico vía `game.remove()`) en vez de
 * eliminar el documento — conserva el historial para auditoría, coherente
 * con el futuro moderador de contenido que necesitará ver qué se retiró.
 */
@Injectable()
export class DeleteGameUseCase implements UseCase<DeleteGameInput, void> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameAuthorization: GameAuthorizationService,
  ) {}

  async execute(input: DeleteGameInput): Promise<void> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const canManage = await this.gameAuthorization.canManage(game, input.requestingUserId);
    if (!canManage) {
      throw new ForbiddenActionError('eliminar este juego');
    }

    game.remove();
    await this.gameRepository.save(game);
  }
}
