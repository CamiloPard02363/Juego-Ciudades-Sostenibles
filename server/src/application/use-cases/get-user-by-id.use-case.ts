import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface GetUserByIdInput {
  userId: string;
}

@Injectable()
export class GetUserByIdUseCase implements UseCase<GetUserByIdInput, UserResponseDto> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: GetUserByIdInput): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    return toUserResponseDto(user);
  }
}
