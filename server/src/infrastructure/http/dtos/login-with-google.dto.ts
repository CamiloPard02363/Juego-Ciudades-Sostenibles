import { IsString, MinLength } from 'class-validator';

export class LoginWithGoogleDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
