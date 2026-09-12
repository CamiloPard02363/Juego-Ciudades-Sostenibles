import { Inject, Injectable } from '@nestjs/common';
import type { Game, GameManagementContext } from '../../domain/entities/game.entity.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { RequesterAdminResolver } from './requester-admin-resolver.service.js';

/**
 * Arma el `GameManagementContext` que `Game.canBeManagedBy` necesita.
 *
 * Punto clave: `isOwningOrganizationAdmin` se resuelve contra la organización
 * **dueña del juego**, no contra las organizaciones del solicitante. Ser ADMIN
 * de la organización A no da ningún permiso sobre juegos de la organización B.
 *
 * Igual que `RequesterAdminResolver`, todo se resuelve contra la base de datos
 * en cada operación en vez de confiar en los claims del JWT.
 */
@Injectable()
export class GameAuthorizationService {
  constructor(
    private readonly requesterAdminResolver: RequesterAdminResolver,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async resolveContext(
    game: Game,
    requestingUserId: string,
  ): Promise<GameManagementContext> {
    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);

    if (isPlatformAdmin) {
      return { isPlatformAdmin: true, isOwningOrganizationAdmin: false };
    }

    const owningOrganizationId = game.organizationId;
    if (!owningOrganizationId) {
      return { isPlatformAdmin: false, isOwningOrganizationAdmin: false };
    }

    const membership = await this.organizationRepository.findMembership(
      owningOrganizationId,
      requestingUserId,
    );

    return {
      isPlatformAdmin: false,
      isOwningOrganizationAdmin: membership?.isAdmin() ?? false,
    };
  }

  async canManage(game: Game, requestingUserId: string): Promise<boolean> {
    const context = await this.resolveContext(game, requestingUserId);
    return game.canBeManagedBy(requestingUserId, context);
  }
}
