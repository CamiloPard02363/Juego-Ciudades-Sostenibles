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
import { EmailAlreadyRegisteredError } from '../errors/application.errors.js';
import { toUserResponseDto, type UserResponseDto } from '../dtos/user-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface RegisterUserInput {
  email: string;
  plainPassword: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  birthDate?: Date;
  locale?: string;
}

@Injectable()
export class RegisterUserUseCase implements UseCase<RegisterUserInput, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: RegisterUserInput): Promise<UserResponseDto> {
    const email = Email.create(input.email);

    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new EmailAlreadyRegisteredError(email.getValue());
    }

    Password.assertIsStrong(input.plainPassword);
    const hashedValue = await this.passwordHasher.hash(input.plainPassword);
    const password = Password.fromHash(hashedValue);

    const name = PersonName.create(input.firstName, input.lastName, input.middleName);

    const user = User.create({
      id: this.idGenerator.generate(),
      email,
      password,
      name,
      role: Role.student(),
      displayName: input.displayName,
      birthDate: input.birthDate ?? null,
      locale: input.locale,
    });

    await this.userRepository.save(user);

    return toUserResponseDto(user);
  }
}
