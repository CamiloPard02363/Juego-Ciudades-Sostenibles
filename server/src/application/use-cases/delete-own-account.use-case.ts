import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port.js';
import { InvalidCredentialsError, UserNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface DeleteOwnAccountInput {
  userId: string;
  currentPlainPassword: string;
}

/**
 * Borrado definitivo (no desactivación) de la propia cuenta, disponible para
 * cualquier rol desde configuración de perfil. Exige la contraseña actual,
 * igual que `ChangeUserPasswordUseCase`, porque es irreversible: a diferencia
 * de `DeactivateUserUseCase` (admin-only, reversible con `reactivate`), acá
 * no hay vuelta atrás una vez confirmado.
 */
@Injectable()
export class DeleteOwnAccountUseCase implements UseCase<DeleteOwnAccountInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: DeleteOwnAccountInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.currentPlainPassword,
      user.password.getHashedValue(),
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    // Revoca las sesiones activas antes de borrar: el borrado en cascada de
    // Prisma se encarga de las filas relacionadas, pero un refresh token ya
    // emitido en otro dispositivo debe dejar de servir de inmediato, no solo
    // cuando el borrado en cascada lo elimine de la tabla.
    await this.refreshTokenRepository.revokeAllForUser(user.id);
    await this.userRepository.delete(user.id);
  }
}
