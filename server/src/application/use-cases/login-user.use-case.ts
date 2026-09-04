import { Inject, Injectable } from '@nestjs/common';
import { Email } from '../../domain/value-objects/email.vo.js';
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
  UserInactiveError,
} from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { TokenPairIssuer } from '../services/token-pair-issuer.service.js';

export interface LoginUserInput {
  email: string;
  plainPassword: string;
}

export interface LoginUserOutput {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LoginUserUseCase implements UseCase<LoginUserInput, LoginUserOutput> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly tokenPairIssuer: TokenPairIssuer,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const email = Email.create(input.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.plainPassword,
      user.password.getHashedValue(),
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    user.registerLogin();
    await this.userRepository.save(user);

    const { accessToken, refreshToken } = await this.tokenPairIssuer.issueFor(user);

    return { user: toUserResponseDto(user), accessToken, refreshToken };
  }
}
