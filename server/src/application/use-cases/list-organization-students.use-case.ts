import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
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

export interface ListOrganizationStudentsInput {
  organizationId: string;
  requestingUserId: string;
}

/**
 * `GET /organizations/:organizationId/students` (issue #133, Frente C,
 * CA-C1): lista los miembros con `orgRole = STUDENT` de la organización, para
 * que un profesor arme la selección de "matricular directo sin código"
 * (Frente C, `POST /classes/:classId/enrollments`).
 *
 * Autorización — cualquiera de:
 * - profesor dueño de alguna Class de esa organización;
 * - `OrganizationRole.ADMIN` de esa organización;
 * - ADMIN global de plataforma.
 * Mismo patrón OR-entre-ejes que `ListOrganizationMembersUseCase`, ampliado
 * con el eje "profesor dueño de una clase" porque ahí no aplica pedirle
 * `OrganizationRole.ADMIN` — el profesor solo necesita ver a sus posibles
 * estudiantes, no administrar la organización.
 */
@Injectable()
export class ListOrganizationStudentsUseCase
  implements UseCase<ListOrganizationStudentsInput, OrganizationMemberDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListOrganizationStudentsInput): Promise<OrganizationMemberDto[]> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    await this.assertAuthorized(input.organizationId, input.requestingUserId);

    const memberships = await this.organizationRepository.findMembershipsByOrganizationId(
      organization.id,
    );
    const studentMemberships = memberships.filter((membership) => membership.orgRole.isStudent());

    const students = await this.userRepository.findByIds(
      studentMemberships.map((membership) => membership.userId),
    );
    const userById = new Map(students.map((user) => [user.id, user]));

    return studentMemberships.map((membership) => {
      const user = userById.get(membership.userId);
      return {
        ...toOrganizationMemberDto(membership),
        displayName: user?.displayName,
        email: user?.email.getValue(),
      };
    });
  }

  private async assertAuthorized(organizationId: string, requestingUserId: string): Promise<void> {
    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);
    if (isPlatformAdmin) return;

    const membership = await this.organizationRepository.findMembership(
      organizationId,
      requestingUserId,
    );
    if (membership?.isAdmin()) return;

    const ownClasses = await this.classRepository.findAllByTeacherUserId(
      requestingUserId,
      true,
    );
    const teachesInOrganization = ownClasses.some(
      (classEntity) => classEntity.organizationId === organizationId,
    );
    if (teachesInOrganization) return;

    throw new ForbiddenActionError('listar los estudiantes de esta organización');
  }
}
