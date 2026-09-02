import { User } from '../../domain/entities/user.entity.js';

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  birthDate: Date | null;
  locale: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  lastUpdate: Date;
}

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email.getValue(),
    firstName: user.name.firstName,
    middleName: user.name.middleName,
    lastName: user.name.lastName,
    displayName: user.displayName,
    role: user.role.getName(),
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    locale: user.locale,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    lastUpdate: user.lastUpdate,
  };
}
