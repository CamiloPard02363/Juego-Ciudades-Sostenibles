import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

/**
 * `message` es texto libre del usuario (instrucciones para guiar a la IA,
 * p. ej. "enfócate en el capítulo 3", o directamente el tema completo del
 * juego), NUNCA un link. Puede ser la ÚNICA fuente de contenido si no se
 * adjunta ningún archivo, en CUALQUIER tipo de juego (issues #234/#238). En
 * los tipos con imagen obligatoria por elemento (Quién Es, Parejas) eso sí,
 * cada elemento del borrador queda sin imagen — la IA no inventa fotos
 * reales, el usuario las agrega a mano después (ver GameAiDraftController).
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
