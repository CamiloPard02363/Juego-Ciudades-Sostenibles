import { DomainError } from './user.errors.js';

export class InvalidGameTypeError extends DomainError {
  constructor(value: string) {
    super(`El tipo de juego "${value}" no es válido.`);
  }
}

export class InvalidGameStateError extends DomainError {
  constructor(reason: string) {
    super(`Operación inválida sobre el juego: ${reason}`);
  }
}

export class InvalidGameContentError extends DomainError {
  constructor(reason: string) {
    super(`Contenido de juego inválido: ${reason}`);
  }
}

export class InvalidGameSlugError extends DomainError {
  constructor(value: string) {
    super(`El identificador "${value}" no es válido: usa minúsculas, números y guiones.`);
  }
}
