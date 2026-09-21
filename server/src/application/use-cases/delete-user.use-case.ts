import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/ports/refresh-token.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface DeleteUserInput {
  requestingUserId: string;
  userId: string;
}

/**
 * Borrado definitivo de la cuenta de OTRO usuario, solo para ADMIN (a
 * diferencia de `DeactivateUserUseCase`, que es reversible con `reactivate`
 * y no borra nada). No toca los juegos que esa persona haya creado: viven en
 * Mongo (`GameModel`), sin relación ni cascada hacia `users` en Postgres —
 * `creatorUserId` queda apuntando a un id que ya no existe, igual que ya
 * pasa hoy con cualquier juego donado a una organización. Para borrar la
 * propia cuenta existe `DeleteOwnAccountUseCase` (exige contraseña).
 */
@Injectable()
export class DeleteUserUseCase implements UseCase<DeleteUserInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(input: DeleteUserInput): Promise<void> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('eliminar un usuario');
    }

    if (input.requestingUserId === input.userId) {
      throw new ForbiddenActionError(
        'eliminar la propia cuenta desde este endpoint (usar la opción de configuración de perfil)',
      );
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    await this.refreshTokenRepository.revokeAllForUser(user.id);
    await this.userRepository.delete(user.id);
  }
}
