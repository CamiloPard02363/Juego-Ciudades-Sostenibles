import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

/** Una tarjeta del set de "¿Quién Es?": imagen + nombre, con audio opcional. */
export interface GuessWhoCard {
  cardId: string;
  imageUrl: string;
  label: string;
  audioUrl: string | null;
}

export interface GuessWhoConfig {
  maxAccusationCount: number;
  /** Segundos que tiene el jugador activo para descartar/pasar turno antes de que pase automático. */
  turnDurationSeconds: number;
}

const DEFAULT_CONFIG: GuessWhoConfig = {
  maxAccusationCount: 6,
  turnDurationSeconds: 15,
};

const MAX_LABEL_LENGTH = 120;
const MAX_URL_LENGTH = 2048;
const MIN_CARDS = 12;
const MAX_CARDS = 60;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

/**
 * Valida config y content para GUESS_WHO — variante propia de "adivina quién":
 * cada jugador recibe al azar una tarjeta secreta del mismo set que ve el
 * rival, y va descartando tarjetas del tablero compartido hasta acusar.
 * `maxAccusationCount` es el umbral de tarjetas restantes a partir del cual
 * la app habilita el botón de acusación (ver RoomsGateway).
 */
@Injectable()
export class GuessWhoContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<GuessWhoConfig>;
    const maxAccusationCount = raw.maxAccusationCount ?? DEFAULT_CONFIG.maxAccusationCount;
    const turnDurationSeconds = raw.turnDurationSeconds ?? DEFAULT_CONFIG.turnDurationSeconds;

    if (!Number.isInteger(maxAccusationCount) || maxAccusationCount < 2 || maxAccusationCount > 12) {
      throw new InvalidGameContentError('maxAccusationCount debe ser un entero entre 2 y 12.');
    }
    if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 5 || turnDurationSeconds > 120) {
      throw new InvalidGameContentError('turnDurationSeconds debe ser un entero entre 5 y 120.');
    }

    return { maxAccusationCount, turnDurationSeconds };
  }

  validateContent(content: unknown): unknown[] {
    if (!Array.isArray(content) || content.length < MIN_CARDS) {
      throw new InvalidGameContentError(`el juego necesita al menos ${MIN_CARDS} tarjetas.`);
    }
    if (content.length > MAX_CARDS) {
      throw new InvalidGameContentError(`el juego admite como máximo ${MAX_CARDS} tarjetas.`);
    }

    return content.map((item, index) => this.validateCard(item, index));
  }

  private validateCard(item: unknown, index: number): GuessWhoCard {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`la tarjeta en la posición ${index} no es un objeto válido.`);
    }

    const card = item as Record<string, unknown>;

    if (!isNonEmptyString(card.label, MAX_LABEL_LENGTH)) {
      throw new InvalidGameContentError(
        `la tarjeta en la posición ${index} necesita label (máximo ${MAX_LABEL_LENGTH} caracteres).`,
      );
    }
    if (!isNonEmptyString(card.imageUrl, MAX_URL_LENGTH)) {
      throw new InvalidGameContentError(`la tarjeta en la posición ${index} necesita imageUrl.`);
    }
    if (!isNullableString(card.audioUrl, MAX_URL_LENGTH)) {
      throw new InvalidGameContentError(`la tarjeta en la posición ${index} tiene un audio inválido.`);
    }

    return {
      cardId: isNonEmptyString(card.cardId, 60) ? card.cardId : `card-${index}`,
      imageUrl: card.imageUrl,
      label: card.label.trim(),
      audioUrl: card.audioUrl ?? null,
    };
  }
}
