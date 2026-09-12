import { Inject, Injectable } from '@nestjs/common';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  OrganizationNotFoundError,
  UserNotFoundError,
} from '../errors/application.errors.js';
import {
  toOrganizationMemberDto,
  type OrganizationMemberDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface AddOrganizationMemberInput {
  organizationId: string;
  requestingUserId: string;
  memberEmail: string;
  orgRole: string;
}

/**
 * Agrega manualmente a un usuario ya registrado como miembro de una
 * organización, con el `orgRole` que elija quien lo agrega. A diferencia del
 * auto-join por dominio de correo (que corre en cada login), aquí el usuario
 * puede tener cualquier dominio de correo — es la vía para vincular gente que
 * ya estaba registrada antes de que su institución reclamara un dominio.
 *
 * Autorización igual a `ListOrganizationMembersUseCase`: ADMIN de esa
 * organización específica o ADMIN global de plataforma.
 */
@Injectable()
export class AddOrganizationMemberUseCase
  implements UseCase<AddOrganizationMemberInput, OrganizationMemberDto>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: AddOrganizationMemberInput): Promise<OrganizationMemberDto> {
    const organization = await this.organizationRepository.findById(input.organizationId);

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(
      input.requestingUserId,
    );

    if (!isPlatformAdmin) {
      const requesterMembership = await this.organizationRepository.findMembership(
        organization.id,
        input.requestingUserId,
      );

      if (!requesterMembership?.isAdmin()) {
        throw new ForbiddenActionError('agregar miembros a esta organización');
      }
    }

    const email = Email.create(input.memberEmail);
    const targetUser = await this.userRepository.findByEmail(email);

    if (!targetUser) {
      throw new UserNotFoundError(email.getValue());
    }

    const membership = OrganizationMembership.create({
      organizationId: organization.id,
      userId: targetUser.id,
      orgRole: OrganizationRole.create(input.orgRole),
    });

    // Falla explícitamente si ya es miembro (a diferencia del upsert
    // idempotente del auto-join) — ver `createMembership` en el repositorio.
    await this.organizationRepository.createMembership(membership);

    return {
      ...toOrganizationMemberDto(membership),
      displayName: targetUser.displayName,
      email: targetUser.email.getValue(),
    };
  }
}
