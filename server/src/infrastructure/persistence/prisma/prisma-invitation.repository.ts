import { Injectable } from '@nestjs/common';
import type { InvitationRepository } from '../../../domain/ports/invitation.repository.port.js';
import type { Invitation } from '../../../domain/entities/invitation.entity.js';
import { PrismaService } from './prisma.service.js';
import { InvitationMapper } from './invitation.mapper.js';

@Injectable()
export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(invitation: Invitation): Promise<void> {
    const data = InvitationMapper.toPersistence(invitation);

    await this.prisma.invitationModel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const record = await this.prisma.invitationModel.findUnique({ where: { tokenHash } });
    return record ? InvitationMapper.toDomain(record) : null;
  }

  async findPendingByOrganizationId(organizationId: string): Promise<Invitation[]> {
    const records = await this.prisma.invitationModel.findMany({
      where: { organizationId, classId: null, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(InvitationMapper.toDomain);
  }

  async findPendingByClassId(classId: string): Promise<Invitation[]> {
    const records = await this.prisma.invitationModel.findMany({
      where: { classId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(InvitationMapper.toDomain);
  }
}
