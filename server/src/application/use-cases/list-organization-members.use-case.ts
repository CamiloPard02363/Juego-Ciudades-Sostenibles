import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import {
  toOrganizationMemberDto,
  type OrganizationMemberDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListOrganizationMembersInput {
  organizationId: string;
  requestingUserId: string;
}

/**
 * Solo el ADMIN **de esa organización** o el ADMIN global de plataforma pueden
 * listar los miembros. Un STUDENT o TEACHER de la organización recibe 403, y
 * ser ADMIN de otra organización tampoco alcanza.
 */
@Injectable()
export class ListOrganizationMembersUseCase
  implements UseCase<ListOrganizationMembersInput, OrganizationMemberDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListOrganizationMembersInput): Promise<OrganizationMemberDto[]> {
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

      if (!membership?.isAdmin()) {
        throw new ForbiddenActionError('listar los miembros de esta organización');
      }
    }

    const memberships = await this.organizationRepository.findMembershipsByOrganizationId(
      organization.id,
    );

    // Un solo findByIds en vez de N consultas: el listado de miembros de un
    // colegio puede tener cientos de filas.
    const users = await this.userRepository.findByIds(
      memberships.map((membership) => membership.userId),
    );
    const userById = new Map(users.map((user) => [user.id, user]));

    return memberships.map((membership) => {
      const user = userById.get(membership.userId);

      return {
        ...toOrganizationMemberDto(membership),
        displayName: user?.displayName,
        email: user?.email.getValue(),
      };
    });
  }
}
