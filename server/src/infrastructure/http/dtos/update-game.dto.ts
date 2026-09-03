import { IsObject, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

class GameThemeDto {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string | null;
}

export class UpdateGameDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsObject()
  theme?: GameThemeDto;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  content?: unknown;
}
