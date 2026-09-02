import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface VerifyUserEmailInput {
  userId: string;
}

@Injectable()
export class VerifyUserEmailUseCase implements UseCase<VerifyUserEmailInput, void> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: VerifyUserEmailInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    user.verifyEmail();
    await this.userRepository.save(user);
  }
}
