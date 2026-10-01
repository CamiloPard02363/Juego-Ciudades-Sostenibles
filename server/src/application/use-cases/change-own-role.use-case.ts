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

export interface ChangeOwnRoleInput {
  userId: string;
  newRole: string;
}

const SELF_SERVICE_ROLES = new Set(['STUDENT', 'TEACHER']);

@Injectable()
export class ChangeOwnRoleUseCase implements UseCase<ChangeOwnRoleInput, UserResponseDto> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: ChangeOwnRoleInput): Promise<UserResponseDto> {
    const normalizedRole = input.newRole.trim().toUpperCase();

    if (!SELF_SERVICE_ROLES.has(normalizedRole)) {
      throw new ForbiddenActionError('cambiar a este rol');
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    user.changeRole(Role.create(normalizedRole));
    await this.userRepository.save(user);

    return toUserResponseDto(user);
  }
}
