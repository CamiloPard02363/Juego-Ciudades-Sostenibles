import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface GetUserByIdInput {
  userId: string;
  requestingUserId: string;
}

@Injectable()
export class GetUserByIdUseCase implements UseCase<GetUserByIdInput, UserResponseDto> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: GetUserByIdInput): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    if (input.requestingUserId !== input.userId) {
      const requestingUser = await this.userRepository.findById(input.requestingUserId);

      if (!requestingUser || !requestingUser.canViewLearningData()) {
        throw new ForbiddenActionError('ver el perfil de otro usuario');
      }
    }

    return toUserResponseDto(user);
  }
}
