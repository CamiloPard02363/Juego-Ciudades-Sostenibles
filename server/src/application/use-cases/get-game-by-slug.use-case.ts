import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import {
  GAME_TYPE_SETTING_REPOSITORY,
  type GameTypeSettingRepository,
} from '../../domain/ports/game-type-setting.repository.port.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { GameAuthorizationService } from '../services/game-authorization.service.js';
import { ClassEnrollmentGameVisibilityService } from '../services/class-enrollment-game-visibility.service.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface GetGameBySlugInput {
  slug: string;
  requestingUserId: string;
}

@Injectable()
export class GetGameBySlugUseCase implements UseCase<GetGameBySlugInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_TYPE_SETTING_REPOSITORY)
    private readonly gameTypeSettingRepository: GameTypeSettingRepository,
    private readonly gameAuthorization: GameAuthorizationService,
    private readonly classEnrollmentGameVisibility: ClassEnrollmentGameVisibilityService,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: GetGameBySlugInput): Promise<GameDetailDto> {
    const game = await this.gameRepository.findBySlug(input.slug);

    if (!game) {
      throw new GameNotFoundError(input.slug);
    }

    // Ver comentario equivalente en GetGameByIdUseCase (issue #156, #101 punto 2).
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isAdmin) {
      const gameTypeSetting = await this.gameTypeSettingRepository.findByGameType(
        game.gameType.getName(),
      );
      if (gameTypeSetting?.isArchived()) {
        throw new GameNotFoundError(input.slug);
      }
    }

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
