import { IsDefined, IsIn, IsObject, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

class GameThemeDto {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string | null;
}

export class CreateGameDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsIn(['MEMORY_MATCH'])
  gameType!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  theme?: GameThemeDto;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  /**
   * Su forma exacta depende de `gameType` (ver ContentValidatorRegistry en
   * application), así que aquí solo se exige que exista — la validación
   * real ocurre en el caso de uso, no en este DTO de transporte HTTP.
   */
  @IsDefined()
  content!: unknown;
}
