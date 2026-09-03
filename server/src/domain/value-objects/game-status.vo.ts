import { InvalidGameTypeError } from '../errors/game.errors.js';

/**
 * DRAFT: recién creado, solo visible para su creador.
 * PUBLISHED: visible para todos en el catálogo de juegos.
 * FLAGGED: marcado por el futuro moderador de contenido (ML) para revisión —
 *          oculto del catálogo pero no borrado, para poder auditar.
 * REMOVED: eliminado por un admin o por el moderador; no vuelve a aparecer.
 */
export type GameStatusName = 'DRAFT' | 'PUBLISHED' | 'FLAGGED' | 'REMOVED';

const VALID_STATUSES: readonly GameStatusName[] = ['DRAFT', 'PUBLISHED', 'FLAGGED', 'REMOVED'];

export class GameStatus {
  private static readonly instances = new Map<GameStatusName, GameStatus>();

  private readonly name: GameStatusName;

  private constructor(name: GameStatusName) {
    this.name = name;
  }

  static create(name: string): GameStatus {
    const normalized = name.trim().toUpperCase() as GameStatusName;

    if (!VALID_STATUSES.includes(normalized)) {
      throw new InvalidGameTypeError(name);
    }

    const cached = GameStatus.instances.get(normalized);
    if (cached) {
      return cached;
    }

    const status = new GameStatus(normalized);
    GameStatus.instances.set(normalized, status);
    return status;
  }

  static draft(): GameStatus {
    return GameStatus.create('DRAFT');
  }

  static published(): GameStatus {
    return GameStatus.create('PUBLISHED');
  }

  static flagged(): GameStatus {
    return GameStatus.create('FLAGGED');
  }

  static removed(): GameStatus {
    return GameStatus.create('REMOVED');
  }

  getName(): GameStatusName {
    return this.name;
  }

  equals(other: GameStatus): boolean {
    return this.name === other.name;
  }

  isPublished(): boolean {
    return this.name === 'PUBLISHED';
  }

  isVisible(): boolean {
    return this.name === 'DRAFT' || this.name === 'PUBLISHED';
  }

  toString(): string {
    return this.name;
  }
}
