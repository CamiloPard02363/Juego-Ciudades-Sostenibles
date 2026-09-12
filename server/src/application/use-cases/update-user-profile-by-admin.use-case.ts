import { Inject, Injectable } from '@nestjs/common';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface UpdateUserProfileByAdminInput {
  requestingUserId: string;
  targetUserId: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  displayName?: string;
  avatarUrl?: string | null;
}

/**
 * Permite a un ADMIN global editar el perfil de OTRO usuario. Se mantiene
 * separado de UpdateUserProfileUseCase (autoservicio del propio usuario) en
 * vez de extenderlo con un requestingUserId opcional: la verificación
 * canManageUsers() es un concern de autorización distinto al de "editar mi
 * propio perfil" y mezclarlo ahí obligaría a todo llamador de ese caso de uso
 * a lidiar con la rama de autorización aunque nunca la use.
 */
@Injectable()
export class UpdateUserProfileByAdminUseCase
  implements UseCase<UpdateUserProfileByAdminInput, UserResponseDto>
{
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(input: UpdateUserProfileByAdminInput): Promise<UserResponseDto> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('editar el perfil de un usuario');
    }

    const targetUser = await this.userRepository.findById(input.targetUserId);

    if (!targetUser) {
      throw new UserNotFoundError(input.targetUserId);
    }

    if (input.firstName || input.lastName || input.middleName !== undefined) {
      const newName = PersonName.create(
        input.firstName ?? targetUser.name.firstName,
        input.lastName ?? targetUser.name.lastName,
        input.middleName !== undefined ? input.middleName : targetUser.name.middleName,
      );
      targetUser.changeName(newName);
    }

    if (input.displayName !== undefined) {
      targetUser.changeDisplayName(input.displayName);
    }

    if (input.avatarUrl !== undefined) {
      targetUser.changeAvatar(input.avatarUrl);
    }

    await this.userRepository.save(targetUser);

    return toUserResponseDto(targetUser);
  }
}
