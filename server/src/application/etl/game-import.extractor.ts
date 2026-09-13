import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { GameImportItemInput } from './game-import.dto.js';

const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 200;

/**
 * Paso de Extracción: chequeo estructural del lote ANTES de gastar ninguna
 * validación de negocio o transacción en él — la forma exacta de cada ítem
 * ya la exige `ImportGamesBatchDto` (class-validator, en el borde HTTP,
 * igual que `CreateGameDto` para un juego suelto); acá solo se valida lo que
 * ese DTO no puede expresar declarativamente: el tamaño del lote como
 * conjunto.
 */
@Injectable()
export class GameImportExtractor {
  parse(items: GameImportItemInput[]): GameImportItemInput[] {
    if (items.length < MIN_BATCH_SIZE) {
      throw new InvalidGameContentError('el lote de importación no puede estar vacío.');
    }
    if (items.length > MAX_BATCH_SIZE) {
      throw new InvalidGameContentError(`el lote de importación admite como máximo ${MAX_BATCH_SIZE} juegos.`);
    }
    return items;
  }
}
