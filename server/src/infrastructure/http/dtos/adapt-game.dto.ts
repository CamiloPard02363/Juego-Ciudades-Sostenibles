import { IsIn, IsOptional, IsString } from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

export class AdaptGameDto {
  @IsIn(VALID_GAME_TYPES)
  targetType!: string;

  /** Solo relevante para MEMORY_MATCH: 'PAIRS' u 'OPPOSITES'. */
  @IsOptional()
  @IsString()
  mode?: string;
}
