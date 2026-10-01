import type { ClassGame } from '../../domain/entities/class-game.entity.js';
import type { GameSummaryDto } from './game-response.dto.js';

/**
 * Vista de un juego EN el contexto de una clase (issue #226, "Juegos de la
 * clase"): combina el resumen del `Game` global con el estado local al
 * vínculo (`isArchived`). Separado de `GameSummaryDto` a propósito — este
 * último describe el juego en sí, nunca su visibilidad dentro de una clase
 * puntual.
 */
export interface ClassGameSummaryDto extends GameSummaryDto {
  isArchived: boolean;
  addedAt: Date;
}

export function toClassGameSummaryDto(
  classGame: ClassGame,
  gameSummary: GameSummaryDto,
): ClassGameSummaryDto {
  return {
    ...gameSummary,
    isArchived: classGame.isArchived,
    addedAt: classGame.addedAt,
  };
}
