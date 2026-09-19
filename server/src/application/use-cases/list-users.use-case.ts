import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import type { RoleName } from '../../domain/value-objects/role.vo.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface ListUsersInput {
  requestingUserId: string;
  role?: RoleName;
  isActive?: boolean;
  /** Substring case-insensitive contra nombre (displayName) o email (issue #106, CA2.1). */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListUsersOutput {
  items: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * La autorización de ADMIN global ya no se resuelve acá — la aplica
 * `RolesGuard` (`@Roles('ADMIN')`) sobre el endpoint HTTP antes de llegar a
 * este use-case (issue #101, reemplaza al chequeo inline con
 * `requestingUser.canManageUsers()` que vivía aquí).
 */
@Injectable()
export class ListUsersUseCase implements UseCase<ListUsersInput, ListUsersOutput> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: ListUsersInput): Promise<ListUsersOutput> {
    const result = await this.userRepository.findAll({
      role: input.role,
      isActive: input.isActive,
      search: input.search,
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
