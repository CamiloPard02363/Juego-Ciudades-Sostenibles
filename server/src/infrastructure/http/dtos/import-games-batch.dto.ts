import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

class GameImportItemThemeDto {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string | null;
}

/**
 * Mismas reglas estructurales que `CreateGameDto` (sin `creatorUserId`,
 * `organizationId` ni `slug` — ver `GameImportItemInput`). La validación de
 * NEGOCIO de `config`/`content` sigue viviendo exclusivamente en
 * `ContentValidatorRegistry`, corrida por `GameFactoryService` dentro del
 * caso de uso — este DTO solo garantiza la forma mínima de transporte.
 */
class GameImportItemDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsIn(VALID_GAME_TYPES)
  gameType!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GameImportItemThemeDto)
  theme?: GameImportItemThemeDto;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsDefined()
  content!: unknown;
}

export class ImportGamesBatchDto {
  /** Clave elegida por quien importa (ej. "curriculum-reciclaje-2026-v1") — ver `GameImportJob`. */
  @IsString()
  @MinLength(3)
  idempotencyKey!: string;

  @ValidateNested({ each: true })
  @Type(() => GameImportItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  items!: GameImportItemDto[];
}
