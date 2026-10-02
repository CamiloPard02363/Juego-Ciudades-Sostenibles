import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

/**
 * `message` es texto libre del usuario (instrucciones para guiar a la IA,
 * p. ej. "enfócate en el capítulo 3", o directamente el tema completo del
 * juego), NUNCA un link. Para tipos de juego sin imagen obligatoria por
 * elemento, puede ser la ÚNICA fuente de contenido si no se adjunta ningún
 * archivo (issue #234) — para los que sí la requieren (Quién Es, Parejas),
 * los archivos siguen siendo obligatorios (ver GameAiDraftController).
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
