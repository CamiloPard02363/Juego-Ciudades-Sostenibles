import { Injectable } from '@nestjs/common';
import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token.repository.port.js';
import type { RefreshToken } from '../../../domain/entities/refresh-token.entity.js';
import { PrismaService } from './prisma.service.js';
import { RefreshTokenMapper } from './refresh-token.mapper.js';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(refreshToken: RefreshToken): Promise<void> {
    const data = RefreshTokenMapper.toPersistence(refreshToken);

    await this.prisma.refreshTokenModel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshTokenModel.findUnique({ where: { tokenHash } });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshTokenModel.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
