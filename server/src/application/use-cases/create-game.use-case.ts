import { Inject, Injectable } from '@nestjs/common';
import { Game } from '../../domain/entities/game.entity.js';
import { GameSlug } from '../../domain/value-objects/game-slug.vo.js';
import { GameType } from '../../domain/value-objects/game-type.vo.js';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { GameSlugAlreadyTakenError } from '../errors/application.errors.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';

export interface CreateGameInput {
  creatorUserId: string;
  title: string;
  description: string;
  gameType: string;
  slug?: string;
  theme?: { primaryColor?: string; coverImageUrl?: string | null };
  config?: unknown;
  content: unknown;
}

/**
 * Cualquier usuario autenticado puede crear un juego (ver ADR en
 * homeworks/pendientes.md): no hay chequeo de rol aquí, a diferencia de
 * CreateUserUseCase. La moderación de contenido queda para el futuro
 * clasificador de ML mencionado por el usuario — mientras tanto los juegos
 * nacen en DRAFT y el creador decide cuándo publicarlos.
 */
@Injectable()
export class CreateGameUseCase implements UseCase<CreateGameInput, GameDetailDto> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly contentValidators: ContentValidatorRegistry,
  ) {}

  async execute(input: CreateGameInput): Promise<GameDetailDto> {
    const gameType = GameType.create(input.gameType);
    const validator = this.contentValidators.resolve(gameType.getName());

    const config = validator.validateConfig(input.config);
    const content = validator.validateContent(input.content);

    const slug = input.slug ? GameSlug.create(input.slug) : GameSlug.fromTitle(input.title);
    const slugTaken = await this.gameRepository.existsBySlug(slug.getValue());
    if (slugTaken) {
      throw new GameSlugAlreadyTakenError(slug.getValue());
    }

    const game = Game.create({
      id: this.idGenerator.generate(),
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      gameType,
      theme: {
        primaryColor: input.theme?.primaryColor ?? '#aa3bff',
        coverImageUrl: input.theme?.coverImageUrl ?? null,
      },
      creatorUserId: input.creatorUserId,
      config,
      content,
    });

    await this.gameRepository.save(game);

    return toGameDetailDto(game);
  }
}
