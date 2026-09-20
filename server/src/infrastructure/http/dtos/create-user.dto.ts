import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** Solo para ADMIN (`POST /users`). A diferencia del registro público, sí permite elegir rol. */
export class CreateUserDto {
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

  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  role!: string;

  /** Para poder segmentar a un STUDENT dado de alta a mano en el Modo Kids (ver kidsMode.ts en el cliente). */
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
