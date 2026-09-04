import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

/** El slug es inmutable tras crear el juego: cambiar de URL rompería enlaces ya compartidos. */
export interface UpdateGameInput {
  gameId: string;
  requestingUserId: string;
  title?: string;
  description?: string;
  theme?: { primaryColor?: string; coverImageUrl?: string | null };
  categoryId?: string;
  config?: unknown;
  content?: unknown;
}

@Injectable()
export class UpdateGameUseCase implements UseCase<UpdateGameInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly contentValidators: ContentValidatorRegistry,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: UpdateGameInput): Promise<GameDetailDto> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!game.canBeManagedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('editar este juego');
    }

    const validator = this.contentValidators.resolve(game.gameType.getName());
    const config = input.config !== undefined ? validator.validateConfig(input.config) : undefined;
    const content =
      input.content !== undefined
        ? validator.validateContent(input.content, config ?? game.config)
        : undefined;

    game.updateDetails({
      title: input.title?.trim(),
      description: input.description?.trim(),
      theme:
        input.theme !== undefined
          ? {
              primaryColor: input.theme.primaryColor ?? game.theme.primaryColor,
              coverImageUrl:
                input.theme.coverImageUrl !== undefined
                  ? input.theme.coverImageUrl
                  : game.theme.coverImageUrl,
            }
          : undefined,
      categoryId: input.categoryId,
      config,
      content,
    });

    await this.gameRepository.save(game);

    return toGameDetailDto(game);
  }
}
