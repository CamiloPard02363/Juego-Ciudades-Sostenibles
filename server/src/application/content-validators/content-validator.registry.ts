import { Injectable } from '@nestjs/common';
import type { GameTypeName } from '../../domain/value-objects/game-type.vo.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';
import { MemoryMatchContentValidator } from './memory-match.content-validator.js';

/**
 * Único punto de la aplicación que sabe qué validador corresponde a cada
 * `gameType`. Agregar un tipo de juego nuevo: crear su validador (como
 * `MemoryMatchContentValidator`), agregarlo aquí y al catálogo de
 * `GameType` en domain — nada de migraciones de esquema.
 */
@Injectable()
export class ContentValidatorRegistry {
  private readonly validators: Record<GameTypeName, ContentValidator>;

  constructor(private readonly memoryMatchValidator: MemoryMatchContentValidator) {
    this.validators = {
      MEMORY_MATCH: this.memoryMatchValidator,
    };
  }

  resolve(gameType: GameTypeName): ContentValidator {
    const validator = this.validators[gameType];
    if (!validator) {
      throw new InvalidGameContentError(`no hay validador registrado para "${gameType}".`);
    }
    return validator;
  }
}
