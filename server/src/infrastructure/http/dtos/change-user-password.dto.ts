import { IsString, MinLength } from 'class-validator';

export class ChangeUserPasswordDto {
  @IsString()
  @MinLength(1)
  currentPlainPassword!: string;

  @IsString()
  @MinLength(8)
  newPlainPassword!: string;
}
