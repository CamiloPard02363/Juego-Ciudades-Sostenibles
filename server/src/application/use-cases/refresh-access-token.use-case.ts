import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { InvalidCredentialsError, UserInactiveError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { TokenPairIssuer } from '../services/token-pair-issuer.service.js';

export interface RefreshAccessTokenInput {
  refreshToken: string;
}

export interface RefreshAccessTokenOutput {
  accessToken: string;
  refreshToken: string;
}

/**
 * Rota el refresh token en cada uso: el que llega se revoca y se emite uno
 * nuevo junto al access token. Rotar (en vez de reutilizar el mismo refresh
 * token hasta que expire) limita el daño si uno se filtra — solo sirve una
 * vez, y si alguien intenta reusar uno ya rotado es señal de robo.
 */
@Injectable()
export class RefreshAccessTokenUseCase
  implements UseCase<RefreshAccessTokenInput, RefreshAccessTokenOutput>
{
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly tokenPairIssuer: TokenPairIssuer,
  ) {}

  async execute(input: RefreshAccessTokenInput): Promise<RefreshAccessTokenOutput> {
    const tokenHash = this.opaqueTokenGenerator.hash(input.refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken || !storedToken.isValid()) {
      throw new InvalidCredentialsError();
    }

    const user = await this.userRepository.findById(storedToken.userId);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    storedToken.revoke();
    await this.refreshTokenRepository.save(storedToken);

    return this.tokenPairIssuer.issueFor(user);
  }
}
