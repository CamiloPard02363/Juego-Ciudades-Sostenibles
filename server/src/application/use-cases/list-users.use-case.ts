import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import type { RoleName } from '../../domain/value-objects/role.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ListUsersInput {
  requestingUserId: string;
  role?: RoleName;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListUsersOutput {
  items: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ListUsersUseCase implements UseCase<ListUsersInput, ListUsersOutput> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('listar usuarios');
    }

    const result = await this.userRepository.findAll({
      role: input.role,
      isActive: input.isActive,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });

    return {
      items: result.items.map(toUserResponseDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
