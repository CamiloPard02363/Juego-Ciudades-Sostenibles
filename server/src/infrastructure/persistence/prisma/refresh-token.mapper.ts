import type { RefreshTokenModel } from '../../../generated/prisma/client.js';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity.js';

export class RefreshTokenMapper {
  static toDomain(record: RefreshTokenModel): RefreshToken {
    return RefreshToken.fromPersistence({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      revokedAt: record.revokedAt,
    });
  }

  static toPersistence(refreshToken: RefreshToken) {
    const props = refreshToken.toPersistence();

    return {
      id: props.id,
      userId: props.userId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      revokedAt: props.revokedAt,
    };
  }
}
