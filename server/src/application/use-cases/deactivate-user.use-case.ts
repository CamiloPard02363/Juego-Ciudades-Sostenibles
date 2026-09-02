import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface DeactivateUserInput {
  userId: string;
}

@Injectable()
export class DeactivateUserUseCase implements UseCase<DeactivateUserInput, void> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: DeactivateUserInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    user.deactivate();
    await this.userRepository.save(user);
  }
}
