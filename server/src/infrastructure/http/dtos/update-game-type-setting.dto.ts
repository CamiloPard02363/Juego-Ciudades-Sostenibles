import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGameTypeSettingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
