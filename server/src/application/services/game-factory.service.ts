import { Inject, Injectable } from '@nestjs/common';
import { Game } from '../../domain/entities/game.entity.js';
import { GameSlug } from '../../domain/value-objects/game-slug.vo.js';
import { GameType } from '../../domain/value-objects/game-type.vo.js';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  GameSlugAlreadyTakenError,
  NotAnOrganizationMemberError,
  OrganizationNotFoundError,
} from '../errors/application.errors.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';

export interface BuildGameInput {
  creatorUserId: string;
  title: string;
  description: string;
  gameType: string;
  categoryId: string;
  organizationId?: string | null;
  slug?: string;
  theme?: { primaryColor?: string; coverImageUrl?: string | null };
  config?: unknown;
  content: unknown;
}

/**
 * Construye y valida un `Game` nuevo a partir de un input crudo: resuelve el
 * tipo, corre el content-validator correspondiente, genera id/slug y
 * verifica membresía de organización si aplica. Extraído de
 * `CreateGameUseCase` (que ahora delega acá) porque `ImportGamesBatchUseCase`
 * (ETL) necesita construir el mismo tipo de entidad validada N veces sin
 * guardarla todavía una por una — el guardado del ETL es un `bulkInsert`
 * transaccional, no N llamadas independientes a `save()`.
 */
@Injectable()
export class GameFactoryService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly contentValidators: ContentValidatorRegistry,
  ) {}

  async build(input: BuildGameInput): Promise<Game> {
    if (input.organizationId) {
      await this.assertIsMemberOf(input.organizationId, input.creatorUserId);
    }

    const gameType = GameType.create(input.gameType);
    const validator = this.contentValidators.resolve(gameType.getName());

    const config = validator.validateConfig(input.config);
    const content = validator.validateContent(input.content, config);

    const id = this.idGenerator.generate();
    const slug = input.slug ? GameSlug.create(input.slug) : GameSlug.fromTitle(input.title, id);

    // Chequeo previo para el caso común (falla rápido con mensaje claro);
    // la garantía real ante una carrera entre dos creaciones simultáneas
    // con el mismo slug la da el índice único en Mongo — ver el catch de
    // duplicado (E11000) en MongoGameRepository.save()/bulkInsert().
    const slugTaken = await this.gameRepository.existsBySlug(slug.getValue());
    if (slugTaken) {
      throw new GameSlugAlreadyTakenError(slug.getValue());
    }

    return Game.create({
      id,
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      gameType,
      theme: {
        primaryColor: input.theme?.primaryColor ?? '#aa3bff',
        coverImageUrl: input.theme?.coverImageUrl ?? null,
      },
      categoryId: input.categoryId,
      creatorUserId: input.creatorUserId,
      organizationId: input.organizationId ?? null,
      config,
      content,
    });
  }

  private async assertIsMemberOf(organizationId: string, userId: string): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(organizationId);
    }

    const membership = await this.organizationRepository.findMembership(
      organizationId,
      userId,
    );

    if (!membership) {
      throw new NotAnOrganizationMemberError(organization.name);
    }
  }
}
