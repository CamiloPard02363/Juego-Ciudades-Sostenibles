import { Invitation } from '../entities/invitation.entity.js';

export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');

export interface InvitationRepository {
  save(invitation: Invitation): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Invitation | null>;
  findPendingByOrganizationId(organizationId: string): Promise<Invitation[]>;
  findPendingByClassId(classId: string): Promise<Invitation[]>;
}
