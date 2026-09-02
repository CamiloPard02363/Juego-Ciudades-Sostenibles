import type { UserModel } from '../../../generated/prisma/client.js';
import { User } from '../../../domain/entities/user.entity.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { Password } from '../../../domain/value-objects/password.vo.js';
import { PersonName } from '../../../domain/value-objects/person-name.vo.js';
import { Role } from '../../../domain/value-objects/role.vo.js';

export class UserMapper {
  static toDomain(record: UserModel): User {
    return User.fromPersistence({
      id: record.id,
      email: Email.create(record.email),
      password: Password.fromHash(record.passwordHash),
      name: PersonName.create(record.firstName, record.lastName, record.middleName),
      role: Role.create(record.role),
      displayName: record.displayName,
      avatarUrl: record.avatarUrl,
      birthDate: record.birthDate,
      locale: record.locale,
      isActive: record.isActive,
      isEmailVerified: record.isEmailVerified,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      lastUpdate: record.lastUpdate,
    });
  }

  static toPersistence(user: User) {
    const props = user.toPersistence();

    return {
      id: props.id,
      email: props.email.getValue(),
      passwordHash: props.password.getHashedValue(),
      firstName: props.name.firstName,
      middleName: props.name.middleName,
      lastName: props.name.lastName,
      displayName: props.displayName,
      role: props.role.getName(),
      avatarUrl: props.avatarUrl,
      birthDate: props.birthDate,
      locale: props.locale,
      isActive: props.isActive,
      isEmailVerified: props.isEmailVerified,
      lastLoginAt: props.lastLoginAt,
    };
  }
}
