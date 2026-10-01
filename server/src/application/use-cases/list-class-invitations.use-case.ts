import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import {
  INVITATION_REPOSITORY,
  type InvitationRepository,
} from '../../domain/ports/invitation.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { toInvitationSummaryDto, type InvitationSummaryDto } from '../dtos/invitation-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';

export interface ListClassInvitationsInput {
  classId: string;
  requestingUserId: string;
}

/**
 * `GET /classes/:id/invitations` (issue #232): invitaciones pendientes de
 * una clase específica. Autorización vía `ClassAccessResolver`, mismo
 * criterio que `InviteStudentToClassUseCase`.
 */
@Injectable()
export class ListClassInvitationsUseCase
  implements UseCase<ListClassInvitationsInput, InvitationSummaryDto[]>
{
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: InvitationRepository,
    private readonly classAccessResolver: ClassAccessResolver,
  ) {}

  async execute(input: ListClassInvitationsInput): Promise<InvitationSummaryDto[]> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(classEntity, input.requestingUserId);
    if (!canManage) {
      throw new ForbiddenActionError('ver las invitaciones de esta clase');
    }

    const invitations = await this.invitationRepository.findPendingByClassId(classEntity.id);
    return invitations.map(toInvitationSummaryDto);
  }
}
