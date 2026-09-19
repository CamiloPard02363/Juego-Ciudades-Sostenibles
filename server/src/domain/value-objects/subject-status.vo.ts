import { InvalidSubjectStatusError } from '../errors/subject.errors.js';

/**
 * PRIVATE: recién creada, solo visible para su creador. Puede eliminarse
 *          (soft-delete) mientras esté en este estado.
 * PUBLIC: visible para todos en el catálogo. Transición unidireccional desde
 *         PRIVATE — no existe camino de vuelta, porque otros usuarios pueden
 *         haber publicado juegos bajo esta materia mientras tanto y
 *         quedarían huérfanos. Sí puede eliminarse estando PUBLIC, pero solo
 *         si su árbol (ella y sus descendientes) no tiene juegos asociados —
 *         ver `Subject.canBeDeletedBy`.
 */
export type SubjectStatusName = 'PRIVATE' | 'PUBLIC';

const VALID_STATUSES: readonly SubjectStatusName[] = ['PRIVATE', 'PUBLIC'];

export class SubjectStatus {
  private static readonly instances = new Map<SubjectStatusName, SubjectStatus>();

  private readonly name: SubjectStatusName;

  private constructor(name: SubjectStatusName) {
    this.name = name;
  }

  static create(name: string): SubjectStatus {
    const normalized = name.trim().toUpperCase() as SubjectStatusName;

    if (!VALID_STATUSES.includes(normalized)) {
      throw new InvalidSubjectStatusError(name);
    }

    const cached = SubjectStatus.instances.get(normalized);
    if (cached) {
      return cached;
    }

    const status = new SubjectStatus(normalized);
    SubjectStatus.instances.set(normalized, status);
    return status;
  }

  static private_(): SubjectStatus {
    return SubjectStatus.create('PRIVATE');
  }

  static public_(): SubjectStatus {
    return SubjectStatus.create('PUBLIC');
  }

  getName(): SubjectStatusName {
    return this.name;
  }

  equals(other: SubjectStatus): boolean {
    return this.name === other.name;
  }

  isPrivate(): boolean {
    return this.name === 'PRIVATE';
  }

  isPublic(): boolean {
    return this.name === 'PUBLIC';
  }

  toString(): string {
    return this.name;
  }
}
