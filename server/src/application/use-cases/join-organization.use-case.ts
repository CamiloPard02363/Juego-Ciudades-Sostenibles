import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { OrganizationNotFoundByInviteCodeError } from '../errors/application.errors.js';
import {
  toOrganizationWithMyRoleDto,
  type OrganizationWithMyRoleDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface JoinOrganizationInput {
  inviteCode: string;
  requestingUserId: string;
}

/**
 * `POST /organizations/join` (issue #133, Frente A, CA-A2): matricula al
 * usuario autenticado como `OrganizationRole.STUDENT` en la organización
 * dueña de ese `inviteCode` — vía análoga a `JoinClassUseCase`, para
 * profesores particulares sin dominio de correo institucional que quieran
 * sumar estudiantes por código en vez de agregarlos uno por uno por correo.
 *
 * Idempotente en espíritu: si el usuario ya es miembro, `createMembership`
 * lanzaría `UserAlreadyMemberOfOrganizationError` (CONFLICT) — se detecta acá
 * antes con `findMembership` para devolver la organización con su rol actual
 * en vez de un error, mismo criterio de "no romper si ya eres miembro" que
 * pide el issue.
 */
@Injectable()
export class JoinOrganizationUseCase
  implements UseCase<JoinOrganizationInput, OrganizationWithMyRoleDto>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async execute(input: JoinOrganizationInput): Promise<OrganizationWithMyRoleDto> {
    const normalizedCode = input.inviteCode.trim().toUpperCase();
    const organization = await this.organizationRepository.findByInviteCode(normalizedCode);

    if (!organization) {
      throw new OrganizationNotFoundByInviteCodeError(normalizedCode);
    }

    // Mismo criterio que JoinClassUseCase: organización desactivada no admite
    // nuevas matrículas (issue #106, CA2.3).
    if (!organization.isActive) {
      throw new ForbiddenException(
        'Esta organización está desactivada y no admite nuevas matrículas.',
      );
    }

    const existingMembership = await this.organizationRepository.findMembership(
      organization.id,
      input.requestingUserId,
    );

    if (existingMembership) {
      return toOrganizationWithMyRoleDto(organization, existingMembership);
    }

    const membership = OrganizationMembership.create({
      organizationId: organization.id,
      userId: input.requestingUserId,
      orgRole: OrganizationRole.student(),
    });

    await this.organizationRepository.createMembership(membership);

    return toOrganizationWithMyRoleDto(organization, membership);
  }
}
