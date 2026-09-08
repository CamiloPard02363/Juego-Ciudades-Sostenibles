import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import type { GameStatusName } from '../../domain/value-objects/game-status.vo.js';
import { toGameSummaryDto, type GameSummaryDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListGamesInput {
  requestingUserId: string;
  /** Sin filtro, el catálogo público solo muestra PUBLISHED (ver regla abajo). */
  status?: GameStatusName;
  /** "solo mis juegos" desde el panel del creador. */
  onlyMine?: boolean;
  /** Excluye los propios: para el listado de "Comunidad" (juegos de otros). */
  excludeMine?: boolean;
  /** Resuelve y adjunta el nombre visible del creador de cada juego (para "Comunidad"). */
  includeCreatorNames?: boolean;
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListGamesOutput {
  items: GameSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ListGamesUseCase implements UseCase<ListGamesInput, ListGamesOutput> {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListGamesInput): Promise<ListGamesOutput> {
    // Un status explícito distinto de PUBLISHED (ver DRAFT/FLAGGED propios)
    // solo lo puede pedir el dueño de esos juegos o un admin viendo todo.
    const requestedNonPublicStatus = input.status && input.status !== 'PUBLISHED';

    let canSeeNonPublic = Boolean(input.onlyMine);
    if (requestedNonPublicStatus && !canSeeNonPublic) {
      canSeeNonPublic = await this.requesterAdminResolver.resolve(input.requestingUserId);
    }

    const status =
      requestedNonPublicStatus && !canSeeNonPublic ? 'PUBLISHED' : input.status ?? 'PUBLISHED';

    const result = await this.gameRepository.findAll({
      status,
      creatorUserId: input.onlyMine ? input.requestingUserId : undefined,
      excludeCreatorUserId: input.excludeMine ? input.requestingUserId : undefined,
      categoryId: input.categoryId,
      search: input.search,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });

    const items = result.items.map(toGameSummaryDto);

    if (input.includeCreatorNames && items.length > 0) {
      const creatorIds = [...new Set(items.map((item) => item.creatorUserId))];
      const creators = await this.userRepository.findByIds(creatorIds);
      const nameById = new Map(creators.map((creator) => [creator.id, creator.displayName]));
      for (const item of items) {
        item.creatorDisplayName = nameById.get(item.creatorUserId);
      }
    }

    return {
      items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
