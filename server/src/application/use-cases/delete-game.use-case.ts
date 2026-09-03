import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

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
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: DeleteGameInput): Promise<void> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!game.canBeManagedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('eliminar este juego');
    }

    game.remove();
    await this.gameRepository.save(game);
  }
}
