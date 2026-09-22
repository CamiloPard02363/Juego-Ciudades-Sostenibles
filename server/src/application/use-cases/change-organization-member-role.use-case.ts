import { Inject, Injectable } from '@nestjs/common';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  CannotChangeOwnOrganizationRoleError,
  OrganizationNotFoundError,
  TargetUserNotMemberOfOrganizationError,
} from '../errors/application.errors.js';
import {
  toOrganizationMemberDto,
  type OrganizationMemberDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ChangeOrganizationMemberRoleInput {
  organizationId: string;
  userId: string;
  requestingUserId: string;
  orgRole: string;
}

/**
 * `PATCH /organizations/:organizationId/members/:userId/role` (issue #133,
 * Frente F, CA-F1): cambia el `OrganizationRole` de un miembro ya existente —
 * hoy la única forma era remover y volver a agregar por correo, lo que perdía
 * `joinedAt` original.
 *
 * Autorización: mismo patrón OR que `AddOrganizationMemberUseCase` — ADMIN de
 * esa organización o ADMIN global.
 *
 * CA-F2: nadie puede cambiar su propio rol, ni siquiera un ADMIN sobre sí
 * mismo — este chequeo va ANTES de resolver si el requester es admin, porque
 * la regla aplica sin excepción (issue: "sin importar si técnicamente tiene
 * el rol para hacerlo sobre otros").
 */
@Injectable()
export class ChangeOrganizationMemberRoleUseCase
  implements UseCase<ChangeOrganizationMemberRoleInput, OrganizationMemberDto>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ChangeOrganizationMemberRoleInput): Promise<OrganizationMemberDto> {
    if (input.requestingUserId === input.userId) {
      throw new CannotChangeOwnOrganizationRoleError();
    }

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
        throw new ForbiddenActionError('cambiar el rol de un miembro de esta organización');
      }
    }

    const targetMembership = await this.organizationRepository.findMembership(
      organization.id,
      input.userId,
    );
    if (!targetMembership) {
      throw new TargetUserNotMemberOfOrganizationError(input.organizationId);
    }

    targetMembership.changeRole(OrganizationRole.create(input.orgRole));
    await this.organizationRepository.saveMembership(targetMembership);

    return toOrganizationMemberDto(targetMembership);
  }
}
