import { IsIn } from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

/**
 * Sin ningún campo de texto/URL a propósito: el asistente de IA solo acepta
 * archivos que el usuario sube, nunca un link a un sitio externo.
 */
export class GenerateGameDraftDto {
  @IsIn(VALID_GAME_TYPES)
  gameType!: string;
}
