import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../../domain/ports/invitation.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import { toInvitationSummaryDto, type InvitationSummaryDto } from '../dtos/invitation-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListOrganizationInvitationsInput {
  organizationId: string;
  requestingUserId: string;
}

/**
 * `GET /organizations/:id/invitations` (issue #232): invitaciones pendientes
 * de la organización (solo a nivel institución, no las de clases
 * particulares — ver `ListClassInvitationsUseCase`). Misma autorización que
 * `InviteStudentToOrganizationUseCase`.
 */
@Injectable()
export class ListOrganizationInvitationsUseCase
  implements UseCase<ListOrganizationInvitationsInput, InvitationSummaryDto[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: InvitationRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListOrganizationInvitationsInput): Promise<InvitationSummaryDto[]> {
    const organization = await this.organizationRepository.findById(input.organizationId);
    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId);
    }

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isPlatformAdmin) {
      const requesterMembership = await this.organizationRepository.findMembership(
        organization.id,
        input.requestingUserId,
      );
      if (!requesterMembership?.isAdmin()) {
        throw new ForbiddenActionError('ver las invitaciones de esta organización');
      }
    }

    const invitations = await this.invitationRepository.findPendingByOrganizationId(organization.id);
    return invitations.map(toInvitationSummaryDto);
  }
}
