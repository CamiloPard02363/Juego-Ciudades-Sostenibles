import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO del registro público (`POST /auth/register`). No expone `role`: cualquiera
 * puede llamar este endpoint sin autenticación, así que el rol nunca es
 * elegible aquí (el caso de uso siempre asigna STUDENT). Asignar un rol
 * distinto es responsabilidad de `CreateUserDto` (admin-only, ver
 * `POST /users`) o de `ChangeUserRoleDto` (`PATCH /users/:id/role`).
 */
export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  plainPassword!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
