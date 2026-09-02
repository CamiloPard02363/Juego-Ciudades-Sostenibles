import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port.js';
import {
  OPAQUE_TOKEN_GENERATOR,
  type OpaqueTokenGenerator,
} from '../../domain/ports/opaque-token-generator.port.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase implements UseCase<LogoutInput, void> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(OPAQUE_TOKEN_GENERATOR) private readonly opaqueTokenGenerator: OpaqueTokenGenerator,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.opaqueTokenGenerator.hash(input.refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    // Revocar un token ya inválido o inexistente no es un error: logout es
    // idempotente por diseño (el cliente puede llamarlo sin saber si la
    // sesión ya había expirado).
    if (storedToken && !storedToken.isRevoked()) {
      storedToken.revoke();
      await this.refreshTokenRepository.save(storedToken);
    }
  }
}
