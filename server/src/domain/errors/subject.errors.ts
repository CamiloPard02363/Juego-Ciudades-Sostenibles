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
