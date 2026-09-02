import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { PersonName } from '../../domain/value-objects/person-name.vo.js';
import { Role } from '../../domain/value-objects/role.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports/user.repository.port.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { EmailAlreadyRegisteredError, UserNotFoundError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

/**
 * Creación de usuarios con rol elegido, solo para ADMIN (ver
 * `RegisterUserUseCase` para el registro público, que siempre asigna
 * STUDENT y no acepta `role` en su input).
 */
export interface CreateUserInput {
  requestingUserId: string;
  email: string;
  plainPassword: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  role: string;
}

@Injectable()
export class CreateUserUseCase implements UseCase<CreateUserInput, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateUserInput): Promise<UserResponseDto> {
    const requestingUser = await this.userRepository.findById(input.requestingUserId);

    if (!requestingUser) {
      throw new UserNotFoundError(input.requestingUserId);
    }

    if (!requestingUser.canManageUsers()) {
      throw new ForbiddenActionError('crear usuarios');
    }

    const email = Email.create(input.email);

    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new EmailAlreadyRegisteredError(email.getValue());
    }

    Password.assertIsStrong(input.plainPassword);
    const hashedValue = await this.passwordHasher.hash(input.plainPassword);
    const password = Password.fromHash(hashedValue);

    const name = PersonName.create(input.firstName, input.lastName, input.middleName);
    const role = Role.create(input.role);

    const user = User.create({
      id: this.idGenerator.generate(),
      email,
      password,
      name,
      role,
      displayName: input.displayName,
    });

    await this.userRepository.save(user);

    return toUserResponseDto(user);
  }
}
