import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity.js';
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import { TOKEN_GENERATOR, type TokenGenerator } from '../../domain/ports/token-generator.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Orquesta la emisión del par access+refresh token. Vive en application (no
 * es un caso de uso en sí, es infraestructura de negocio compartida por
 * LoginUserUseCase, el registro encadenado y RefreshAccessTokenUseCase) para
 * no triplicar esta lógica en cada punto que autentica a un usuario.
 */
@Injectable()
export class TokenPairIssuer {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
    @Inject(TOKEN_GENERATOR) private readonly tokenGenerator: TokenGenerator,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async issueFor(user: User): Promise<TokenPair> {
    const accessToken = await this.tokenGenerator.generate({
      userId: user.id,
      email: user.email.getValue(),
      role: user.role.getName(),
    });

    const plainRefreshToken = this.opaqueTokenGenerator.generate();
    const refreshToken = RefreshToken.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      tokenHash: this.opaqueTokenGenerator.hash(plainRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    await this.refreshTokenRepository.save(refreshToken);

    return { accessToken, refreshToken: plainRefreshToken };
  }
}
