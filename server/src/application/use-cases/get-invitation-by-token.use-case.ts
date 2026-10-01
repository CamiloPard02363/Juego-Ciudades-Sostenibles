import { Inject, Injectable } from '@nestjs/common';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../../domain/ports/invitation.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import {
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '../errors/application.errors.js';
import { toInvitationPreviewDto, type InvitationPreviewDto } from '../dtos/invitation-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface GetInvitationByTokenInput {
  token: string;
}

/**
 * `GET /invitations/:token` (issue #232): endpoint público (sin auth) para
 * precargar el formulario de "completar registro" con los datos nominales
 * de la invitación, antes de que el estudiante defina su contraseña.
 */
@Injectable()
export class GetInvitationByTokenUseCase
  implements UseCase<GetInvitationByTokenInput, InvitationPreviewDto>
{
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: InvitationRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
  ) {}

  async execute(input: GetInvitationByTokenInput): Promise<InvitationPreviewDto> {
    const tokenHash = this.opaqueTokenGenerator.hash(input.token);
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }
    if (invitation.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }
    if (invitation.isExpired()) {
      throw new InvitationExpiredError();
    }

    return toInvitationPreviewDto(invitation);
  }
}
