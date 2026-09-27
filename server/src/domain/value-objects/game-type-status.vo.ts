import { InvalidGameTypeStatusError } from '../errors/game.errors.js';

/**
 * ACTIVE: el tipo de juego admite creación normal y sus instancias son
 *         visibles según su propio `GameStatus` (DRAFT/PUBLISHED/etc).
 * ARCHIVED: nadie (ni ADMIN) puede crear juegos nuevos de este tipo, y todas
 *           sus instancias existentes quedan ocultas para no-ADMIN sin
 *           importar su `GameStatus` individual — ver
 *           `entities/game-type-setting.entity.ts` y la regla de negocio en
 *           el issue #156. Reversible: al volver a ACTIVE todo reaparece
 *           automáticamente, sin migración de datos.
 */
export type GameTypeStatusName = 'ACTIVE' | 'ARCHIVED';

const VALID_STATUSES: readonly GameTypeStatusName[] = ['ACTIVE', 'ARCHIVED'];

export class GameTypeStatus {
  private static readonly instances = new Map<GameTypeStatusName, GameTypeStatus>();

  private readonly name: GameTypeStatusName;

  private constructor(name: GameTypeStatusName) {
    this.name = name;
  }

  static create(name: string): GameTypeStatus {
    const normalized = name.trim().toUpperCase() as GameTypeStatusName;

    if (!VALID_STATUSES.includes(normalized)) {
      throw new InvalidGameTypeStatusError(name);
    }

    const cached = GameTypeStatus.instances.get(normalized);
    if (cached) {
      return cached;
    }

    const status = new GameTypeStatus(normalized);
    GameTypeStatus.instances.set(normalized, status);
    return status;
  }

  static active(): GameTypeStatus {
    return GameTypeStatus.create('ACTIVE');
  }

  static archived(): GameTypeStatus {
    return GameTypeStatus.create('ARCHIVED');
  }

  getName(): GameTypeStatusName {
    return this.name;
  }

  equals(other: GameTypeStatus): boolean {
    return this.name === other.name;
  }

  isActive(): boolean {
    return this.name === 'ACTIVE';
  }

  isArchived(): boolean {
    return this.name === 'ARCHIVED';
  }

  toString(): string {
    return this.name;
  }
}
