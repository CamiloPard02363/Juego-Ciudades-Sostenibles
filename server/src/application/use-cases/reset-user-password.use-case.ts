import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Password } from '../../domain/value-objects/password.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ResetUserPasswordInput {
  requestingUserId: string;
  userId: string;
}

export interface ResetUserPasswordOutput {
  temporaryPassword: string;
}

/**
 * Contraseña temporal segura: 16 bytes de aleatoriedad criptográfica
 * codificados en base64url, garantizando además al menos una mayúscula,
 * una minúscula y un número para satisfacer Password.assertIsStrong().
 */
function generateTemporaryPassword(): string {
  const randomPart = randomBytes(16).toString('base64url');
  return `Aa1${randomPart}`;
}

@Injectable()
export class ResetUserPasswordUseCase
  implements UseCase<ResetUserPasswordInput, ResetUserPasswordOutput>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: ResetUserPasswordInput): Promise<ResetUserPasswordOutput> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('resetear la contraseña de un usuario');
    }

    const targetUser = await this.userRepository.findById(input.userId);

    if (!targetUser) {
      throw new UserNotFoundError(input.userId);
    }

    const temporaryPassword = generateTemporaryPassword();
    Password.assertIsStrong(temporaryPassword);

    const newHashedValue = await this.passwordHasher.hash(temporaryPassword);
    targetUser.changePassword(Password.fromHash(newHashedValue));

    await this.userRepository.save(targetUser);

    return { temporaryPassword };
  }
}
