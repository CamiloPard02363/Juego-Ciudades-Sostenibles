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
import {
  InvalidCredentialsError,
  UserNotFoundError,
} from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ChangeUserPasswordInput {
  userId: string;
  currentPlainPassword: string;
  newPlainPassword: string;
}

@Injectable()
export class ChangeUserPasswordUseCase implements UseCase<ChangeUserPasswordInput, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: ChangeUserPasswordInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    const currentPasswordMatches = await this.passwordHasher.compare(
      input.currentPlainPassword,
      user.password.getHashedValue(),
    );

    if (!currentPasswordMatches) {
      throw new InvalidCredentialsError();
    }

    Password.assertIsStrong(input.newPlainPassword);
    const newHashedValue = await this.passwordHasher.hash(input.newPlainPassword);
    user.changePassword(Password.fromHash(newHashedValue));

    await this.userRepository.save(user);
  }
}
