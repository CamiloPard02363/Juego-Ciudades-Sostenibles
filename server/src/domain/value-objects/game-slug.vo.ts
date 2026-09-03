import { InvalidGameSlugError } from '../errors/game.errors.js';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class GameSlug {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): GameSlug {
    const normalized = value.trim().toLowerCase();

    if (!SLUG_PATTERN.test(normalized) || normalized.length > 80) {
      throw new InvalidGameSlugError(value);
    }

    return new GameSlug(normalized);
  }

  /** Deriva un slug legible a partir de un título libre (no garantiza unicidad). */
  static fromTitle(title: string): GameSlug {
    const base = title
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita acentos
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
      .replace(/-$/, '');

    return GameSlug.create(base || 'juego');
  }

  getValue(): string {
    return this.value;
  }

  equals(other: GameSlug): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
