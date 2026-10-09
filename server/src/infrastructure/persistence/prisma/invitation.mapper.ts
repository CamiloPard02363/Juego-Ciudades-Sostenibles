import type { InvitationModel } from '../../../generated/prisma/client.js';
import { Invitation } from '../../../domain/entities/invitation.entity.js';

export class InvitationMapper {
  static toDomain(record: InvitationModel): Invitation {
    return Invitation.fromPersistence({
      id: record.id,
      tokenHash: record.tokenHash,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      organizationId: record.organizationId,
      classId: record.classId,
      invitedByUserId: record.invitedByUserId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      acceptedAt: record.acceptedAt,
    });
  }

  static toPersistence(invitation: Invitation) {
    const props = invitation.toPersistence();

    return {
      id: props.id,
      tokenHash: props.tokenHash,
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      organizationId: props.organizationId,
      classId: props.classId,
      invitedByUserId: props.invitedByUserId,
      createdAt: props.createdAt,
      expiresAt: props.expiresAt,
      acceptedAt: props.acceptedAt,
    };
  }
}
