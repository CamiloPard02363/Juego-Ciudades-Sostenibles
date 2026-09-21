import { IsString, MinLength } from 'class-validator';

export class DeleteOwnAccountDto {
  @IsString()
  @MinLength(1)
  currentPlainPassword!: string;
}
