import { Inject, Injectable } from '@nestjs/common';
import { Invitation } from '../../domain/entities/invitation.entity.js';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../../domain/ports/invitation.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import type { EnrollOrInviteResultDto } from '../dtos/invitation-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { InvitationLinkBuilder } from '../services/invitation-link-builder.service.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface InviteStudentToOrganizationInput {
  organizationId: string;
  requestingUserId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Alta manual de un estudiante a una institución (issue #232). Dos caminos
 * según si el email ya tiene cuenta:
 * - Ya existe: se vincula directo como `OrganizationRole.STUDENT` (sin
 *   token), mismo criterio de idempotencia que `JoinOrganizationUseCase` —
 *   si ya es miembro, no duplica la membresía.
 * - No existe: se genera una invitación con token de un solo uso y
 *   expirable; el admin/profesor copia y distribuye el link manualmente (MVP
 *   sin envío de email real).
 *
 * Autorización: `OrganizationRole.ADMIN` de esta organización específica, o
 * `Role.ADMIN` de plataforma — mismo criterio que `AddOrganizationMemberUseCase`.
 */
@Injectable()
export class InviteStudentToOrganizationUseCase
  implements UseCase<InviteStudentToOrganizationInput, EnrollOrInviteResultDto>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: InvitationRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly requesterAdminResolver: RequesterAdminResolver,
    private readonly invitationLinkBuilder: InvitationLinkBuilder,
  ) {}

  async execute(input: InviteStudentToOrganizationInput): Promise<EnrollOrInviteResultDto> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    await this.assertAuthorized(organization.id, input.requestingUserId);

    const email = Email.create(input.email);
    const name = PersonName.create(input.firstName, input.lastName);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      const existingMembership = await this.organizationRepository.findMembership(
        organization.id,
        existingUser.id,
      );

      if (!existingMembership) {
        const membership = OrganizationMembership.create({
          organizationId: organization.id,
          userId: existingUser.id,
          orgRole: OrganizationRole.student(),
        });
        await this.organizationRepository.createMembership(membership);
      }

      return { status: 'LINKED', userId: existingUser.id };
    }

    const plainToken = this.opaqueTokenGenerator.generate();
    const invitation = Invitation.create({
      id: this.idGenerator.generate(),
      tokenHash: this.opaqueTokenGenerator.hash(plainToken),
      email: email.getValue(),
      firstName: name.firstName,
      lastName: name.lastName,
      organizationId: organization.id,
      invitedByUserId: input.requestingUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    });

    await this.invitationRepository.save(invitation);

    return {
      status: 'PENDING',
      invitationUrl: this.invitationLinkBuilder.build(plainToken),
      expiresAt: invitation.expiresAt,
    };
  }

  private async assertAuthorized(organizationId: string, requestingUserId: string): Promise<void> {
    const isPlatformAdmin = await this.requesterAdminResolver.resolve(requestingUserId);
    if (isPlatformAdmin) return;

    const requesterMembership = await this.organizationRepository.findMembership(
      organizationId,
      requestingUserId,
    );
    if (requesterMembership?.isAdmin()) return;

    throw new ForbiddenActionError('invitar estudiantes a esta organización');
  }
}
