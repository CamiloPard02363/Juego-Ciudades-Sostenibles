import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface DeactivateUserInput {
  requestingUserId: string;
  userId: string;
}

@Injectable()
export class DeactivateUserUseCase implements UseCase<DeactivateUserInput, void> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: DeactivateUserInput): Promise<void> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('desactivar un usuario');
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    user.deactivate();
    await this.userRepository.save(user);
  }
}
