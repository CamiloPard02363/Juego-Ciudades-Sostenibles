import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

/**
 * `message` es texto libre del usuario (instrucciones para guiar a la IA,
 * p. ej. "enfócate en el capítulo 3"), NUNCA un link: los archivos siguen
 * siendo obligatorios (ver GameAiDraftController) y son la única fuente de
 * contenido — el mensaje solo orienta cómo se usa ese contenido.
 */
export class GenerateGameDraftDto {
  @IsIn(VALID_GAME_TYPES)
  gameType!: string;

  /** Solo relevante para MEMORY_MATCH: 'PAIRS' u 'OPPOSITES'. */
  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
