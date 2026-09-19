import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface RemoveOrganizationMemberInput {
  organizationId: string;
  userId: string;
  requestingUserId: string;
}

/**
 * Remueve la membresía `(organizationId, userId)` de una organización (issue
 * #106, CA3.1).
 *
 * Autorización resuelta acá en vez de en `RolesGuard` porque la regla real es
 * "ADMIN de ESTA organización **o** ADMIN global de plataforma" — un OR entre
 * ambos ejes que el guard declarativo no expresa (`@Roles` +
 * `@OrganizationRoles` juntos en una misma ruta se combinan como AND). Mismo
 * patrón que `ListOrganizationMembersUseCase` (issue #101).
 *
 * Al desvincular un TEACHER con clases activas en la organización (CA3.3), no
 * se toca ninguna Class: `Class.organizationId` y `Class.teacherUserId`
 * quedan intactos — esto es efecto de no-acción: simplemente no existe acá
 * ninguna cascada hacia `ClassModel` que reasigne o borre.
 */
@Injectable()
export class RemoveOrganizationMemberUseCase
  implements UseCase<RemoveOrganizationMemberInput, void>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: RemoveOrganizationMemberInput): Promise<void> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);

    if (!isPlatformAdmin) {
      const requestingMembership = await this.organizationRepository.findMembership(
        organization.id,
        input.requestingUserId,
      );

      if (!requestingMembership?.isAdmin()) {
        throw new ForbiddenActionError('remover un miembro de esta organización');
      }
    }

    await this.organizationRepository.removeMembership(input.organizationId, input.userId);
  }
}
