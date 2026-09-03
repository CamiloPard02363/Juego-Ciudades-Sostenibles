import { InvalidGameTypeError } from '../errors/game.errors.js';

/**
 * Catálogo de tipos de juego soportados por la plataforma. Agregar un tipo
 * nuevo (ej. 'QUIZ') es un cambio de código deliberado: cada tipo trae su
 * propio validador de contenido (ver `application/content-validators/`), así
 * que no tiene sentido que sea data en DB — es la mecánica del juego, no una
 * instancia de contenido.
 */
export type GameTypeName = 'MEMORY_MATCH';

const VALID_GAME_TYPES: readonly GameTypeName[] = ['MEMORY_MATCH'];

export class GameType {
  private static readonly instances = new Map<GameTypeName, GameType>();

  private readonly name: GameTypeName;

  private constructor(name: GameTypeName) {
    this.name = name;
  }

  static create(name: string): GameType {
    const normalized = name.trim().toUpperCase() as GameTypeName;

    if (!VALID_GAME_TYPES.includes(normalized)) {
      throw new InvalidGameTypeError(name);
    }

    const cached = GameType.instances.get(normalized);
    if (cached) {
      return cached;
    }

    const gameType = new GameType(normalized);
    GameType.instances.set(normalized, gameType);
    return gameType;
  }

  static memoryMatch(): GameType {
    return GameType.create('MEMORY_MATCH');
  }

  getName(): GameTypeName {
    return this.name;
  }

  equals(other: GameType): boolean {
    return this.name === other.name;
  }

  toString(): string {
    return this.name;
  }
}
