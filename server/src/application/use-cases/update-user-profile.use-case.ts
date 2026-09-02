import { Inject, Injectable } from '@nestjs/common';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface UpdateUserProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UpdateUserProfileUseCase
  implements UseCase<UpdateUserProfileInput, UserResponseDto>
{
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: UpdateUserProfileInput): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    if (input.firstName || input.lastName || input.middleName !== undefined) {
      const newName = PersonName.create(
        input.firstName ?? user.name.firstName,
        input.lastName ?? user.name.lastName,
        input.middleName !== undefined ? input.middleName : user.name.middleName,
      );
      user.changeName(newName);
    }

    if (input.displayName !== undefined) {
      user.changeDisplayName(input.displayName);
    }

    if (input.avatarUrl !== undefined) {
      user.changeAvatar(input.avatarUrl);
    }

    await this.userRepository.save(user);

    return toUserResponseDto(user);
  }
}
