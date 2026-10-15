import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import {
  GAME_TYPE_SETTING_REPOSITORY,
  type GameTypeSettingRepository,
} from '../../domain/ports/game-type-setting.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { GameType } from '../../domain/value-objects/game-type.vo.js';
import { GameNotFoundError } from '../errors/application.errors.js';
import { resolveGamePromptSpec } from '../ai/game-prompt-catalog.js';
import { buildGameSourceText } from '../ai/game-content-source-text.js';
import type { UseCase } from '../ports/use-case.port.js';
import { GameAuthorizationService } from '../services/game-authorization.service.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { GenerateGameDraftUseCase } from './generate-game-draft.use-case.js';

export interface AdaptGameInput {
  gameId: string;
  requestingUserId: string;
  targetType: string;
  /** Solo relevante para MEMORY_MATCH: 'PAIRS' u 'OPPOSITES'. */
  mode?: string;
}

export interface AdaptGameOutput {
  sourceGameId: string;
  title: string;
  description: string;
  categoryId: string;
  theme: { primaryColor: string; coverImageUrl: string | null };
  config: Record<string, unknown>;
  content: unknown[];
  notice?: string;
}

/**
 * Adapta el tema de un juego existente a otro tipo de juego (issue #8, fase
 * 1): el contenido del origen entra como texto fuente al mismo generador de
 * borradores que usa el asistente de IA, así que el resultado pasa por el
 * MISMO validador del tipo destino. Nunca guarda nada — devuelve un borrador
 * que el usuario revisa y crea con el flujo normal (`POST /games`), donde
 * nace como juego NUEVO a nombre de quien lo adaptó; el origen no se toca.
 *
 * Puede adaptar: cualquier juego PUBLISHED, o uno que el usuario ya puede
 * gestionar (propio, institucional de su organización, ADMIN).
 */
@Injectable()
export class AdaptGameUseCase implements UseCase<AdaptGameInput, AdaptGameOutput> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_TYPE_SETTING_REPOSITORY)
    private readonly gameTypeSettingRepository: GameTypeSettingRepository,
    private readonly gameAuthorization: GameAuthorizationService,
    private readonly requesterAdminResolver: RequesterAdminResolver,
    private readonly generateGameDraft: GenerateGameDraftUseCase,
  ) {}

  async execute(input: AdaptGameInput): Promise<AdaptGameOutput> {
    const game = await this.gameRepository.findById(input.gameId);
    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);

    // Mismo criterio que GetGameById: un tipo archivado no se filtra a un no-ADMIN.
    if (!isAdmin) {
      const sourceSetting = await this.gameTypeSettingRepository.findByGameType(
        game.gameType.getName(),
      );
      if (sourceSetting?.isArchived()) {
        throw new GameNotFoundError(input.gameId);
      }
    }

    if (!game.status.isPublished()) {
      const canManage = await this.gameAuthorization.canManage(game, input.requestingUserId);
      if (!canManage) {
        throw new ForbiddenActionError('adaptar este juego');
      }
    }

    const targetType = GameType.create(input.targetType);
    const targetName = targetType.getName();

    const sourceMode =
      game.gameType.getName() === 'MEMORY_MATCH' && typeof game.config.mode === 'string'
        ? game.config.mode
        : undefined;
    const sameType = targetName === game.gameType.getName();
    if (sameType && (targetName !== 'MEMORY_MATCH' || input.mode === sourceMode)) {
      throw new InvalidGameContentError('elige un tipo de juego distinto al del juego original.');
    }

    const targetSetting = await this.gameTypeSettingRepository.findByGameType(targetName);
    if (targetSetting?.isArchived()) {
      throw new InvalidGameContentError('ese tipo de juego no está disponible por ahora.');
    }

    if (!resolveGamePromptSpec(targetName, input.mode)) {
      throw new InvalidGameContentError(
        `todavía no se puede adaptar un juego a "${input.targetType}".`,
      );
    }

    const draft = await this.generateGameDraft.execute({
      gameType: targetName,
      mode: input.mode,
      message: `Conserva el tema "${game.title}" y adapta los conceptos/preguntas del juego original a esta nueva mecánica. No inventes datos que contradigan el original.`,
      files: [],
      sourceText: buildGameSourceText(game),
    });

    const adaptedNotice = `Adaptado de «${game.title}» — revisa el contenido antes de guardarlo.`;

    return {
      sourceGameId: game.id,
      title: game.title,
      description: game.description,
      categoryId: game.categoryId,
      theme: game.theme,
      config: draft.config,
      content: draft.content,
      notice: draft.notice ? `${adaptedNotice} ${draft.notice}` : adaptedNotice,
    };
  }
}
