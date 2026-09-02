import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { Role } from '../../domain/value-objects/role.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ChangeUserRoleInput {
  requestingUserId: string;
  targetUserId: string;
  newRole: string;
}

@Injectable()
export class ChangeUserRoleUseCase implements UseCase<ChangeUserRoleInput, UserResponseDto> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: ChangeUserRoleInput): Promise<UserResponseDto> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('cambiar el rol de un usuario');
    }

    const targetUser = await this.userRepository.findById(input.targetUserId);

    if (!targetUser) {
      throw new UserNotFoundError(input.targetUserId);
    }

    targetUser.changeRole(Role.create(input.newRole));
    await this.userRepository.save(targetUser);

    return toUserResponseDto(targetUser);
  }
}
