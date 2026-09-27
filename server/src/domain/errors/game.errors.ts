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

/**
 * Alguien más guardó una versión más nueva del juego entre que este cliente
 * lo leyó y lo volvió a guardar (edición concurrente). Se lanza en vez de
 * dejar que la escritura más reciente pise en silencio a la más vieja.
 */
export class GameVersionConflictError extends DomainError {
  constructor(gameId: string) {
    super(`El juego "${gameId}" fue modificado por otra operación; recarga e intenta de nuevo.`);
  }
}

export class InvalidGameTypeStatusError extends DomainError {
  constructor(value: string) {
    super(`El estado de tipo de juego "${value}" no es válido.`);
  }
}

/**
 * Bloqueo transversal de creación (issue #156): mientras el `GameType` esté
 * ARCHIVED, nadie puede crear juegos nuevos de ese tipo, sin excepción de rol.
 */
export class GameTypeArchivedError extends DomainError {
  constructor(gameType: string) {
    super(`El tipo de juego "${gameType}" está archivado y no admite nuevas creaciones.`);
  }
}

export class GameTypeAlreadyArchivedError extends DomainError {
  constructor(gameType: string) {
    super(`El tipo de juego "${gameType}" ya está archivado.`);
  }
}

export class GameTypeNotArchivedError extends DomainError {
  constructor(gameType: string) {
    super(`El tipo de juego "${gameType}" no está archivado.`);
  }
}
