import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Alta manual de un estudiante a institución/clase (issue #232). Solo
 * nombre + email — el apellido se separa porque `PersonName` del dominio
 * exige `firstName`/`lastName`, mismo criterio que `RegisterUserDto`.
 */
export class InviteStudentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
