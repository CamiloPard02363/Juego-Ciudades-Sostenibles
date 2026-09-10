import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  GameNotFoundError,
  OrganizationNotFoundError,
} from '../errors/application.errors.js';
import { toGameDetailDto, type GameDetailDto } from '../dtos/game-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface DonateGameToOrganizationInput {
  gameId: string;
  organizationId: string;
  requestingUserId: string;
}

/**
 * Dona un juego personal a una organización.
 *
 * Pueden donar:
 * - el **creador** del juego, siempre que sea miembro de la organización destino
 *   (no se puede regalar un juego a una institución ajena);
 * - un **ADMIN de la organización destino**, incluso sobre juegos de otros
 *   usuarios — es la vía para que un colegio absorba material de sus miembros;
 * - el **ADMIN global** de plataforma, sin restricción.
 *
 * `creatorUserId` NO cambia: la autoría se preserva tras la donación.
 */
@Injectable()
export class DonateGameToOrganizationUseCase
  implements UseCase<DonateGameToOrganizationInput, GameDetailDto>
{
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: DonateGameToOrganizationInput): Promise<GameDetailDto> {
    const game = await this.gameRepository.findById(input.gameId);

    if (!game) {
      throw new GameNotFoundError(input.gameId);
    }

    const organization = await this.organizationRepository.findById(input.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(
      input.requestingUserId,
    );

    if (!isPlatformAdmin) {
      const membership = await this.organizationRepository.findMembership(
        organization.id,
        input.requestingUserId,
      );

      if (!membership) {
        throw new ForbiddenActionError('donar un juego a una organización que no integra');
      }

      const isGameCreator = game.creatorUserId === input.requestingUserId;

      if (!isGameCreator && !membership.isAdmin()) {
        throw new ForbiddenActionError('donar un juego de otro usuario a esta organización');
      }
    }

    // `donateTo` valida el estado del juego (no eliminado, no ya institucional).
    game.donateTo(organization.id);
    await this.gameRepository.save(game);

    return toGameDetailDto(game);
  }
}
