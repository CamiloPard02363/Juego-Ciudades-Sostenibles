import { DomainError } from './user.errors.js';

export class InvalidSubjectNameError extends DomainError {
  constructor(reason: string) {
    super(`Nombre de materia inválido: ${reason}`);
  }
}

export class InvalidSubjectStatusError extends DomainError {
  constructor(value: string) {
    super(`El estado de materia "${value}" no es válido.`);
  }
}

export class InvalidSubjectStateError extends DomainError {
  constructor(reason: string) {
    super(`Operación inválida sobre la materia: ${reason}`);
  }
}

/** El árbol de la materia (ella o alguna sub-materia descendiente) tiene juegos asociados. */
export class SubjectHasGamesError extends DomainError {
  constructor() {
    super('No se puede eliminar la materia: ella o alguna de sus sub-materias tiene juegos asociados.');
  }
}
