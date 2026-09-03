import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

export type MemoryMatchMode = 'OPPOSITES' | 'PAIRS';

/** Modo OPPOSITES: cada pareja enfrenta un aspecto positivo con su contraparte negativa. */
export interface OppositesPair {
  mode: 'OPPOSITES';
  pairId: string;
  posTitle: string;
  posDescription: string;
  posImageUrl: string | null;
  negTitle: string;
  negDescription: string;
  negImageUrl: string | null;
}

/** Modo PAIRS: una carta con imagen se empareja con la carta que nombra ese concepto. */
export interface SimplePair {
  mode: 'PAIRS';
  pairId: string;
  imageUrl: string;
  label: string;
}

export type MemoryMatchPair = OppositesPair | SimplePair;

export interface MemoryMatchConfig {
  mode: MemoryMatchMode;
  perZone: number;
  timePerZoneSeconds: number;
  previewSeconds: number;
}

const DEFAULT_CONFIG: MemoryMatchConfig = {
  mode: 'OPPOSITES',
  perZone: 8,
  timePerZoneSeconds: 90,
  previewSeconds: 5,
};

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_IMAGE_URL_LENGTH = 2048;
const VALID_MODES: readonly MemoryMatchMode[] = ['OPPOSITES', 'PAIRS'];

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
  );
}

function isNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= maxLength);
}

/**
 * Valida config y content para el tipo MEMORY_MATCH — el juego de memoria por
 * parejas que originalmente vivía hardcodeado en el index.html del prototipo.
 * `config.mode` distingue dos variantes de la misma mecánica de volteo:
 * OPPOSITES (positivo/negativo, como el prototipo original) y PAIRS (imagen
 * con su concepto). Es una rama del mismo validador, no un gameType nuevo,
 * porque ambas comparten la mecánica de juego — solo cambia la forma de la
 * pareja.
 */
@Injectable()
export class MemoryMatchContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<MemoryMatchConfig>;

    const mode = raw.mode ?? DEFAULT_CONFIG.mode;
    const perZone = raw.perZone ?? DEFAULT_CONFIG.perZone;
    const timePerZoneSeconds = raw.timePerZoneSeconds ?? DEFAULT_CONFIG.timePerZoneSeconds;
    const previewSeconds = raw.previewSeconds ?? DEFAULT_CONFIG.previewSeconds;

    if (!VALID_MODES.includes(mode)) {
      throw new InvalidGameContentError(`mode debe ser uno de: ${VALID_MODES.join(', ')}.`);
    }
    if (!Number.isInteger(perZone) || perZone < 2 || perZone > 20) {
      throw new InvalidGameContentError('perZone debe ser un entero entre 2 y 20.');
    }
    if (!Number.isInteger(timePerZoneSeconds) || timePerZoneSeconds < 10 || timePerZoneSeconds > 600) {
      throw new InvalidGameContentError('timePerZoneSeconds debe ser un entero entre 10 y 600.');
    }
    if (!Number.isInteger(previewSeconds) || previewSeconds < 0 || previewSeconds > 30) {
      throw new InvalidGameContentError('previewSeconds debe ser un entero entre 0 y 30.');
    }

    return { mode, perZone, timePerZoneSeconds, previewSeconds };
  }

  validateContent(content: unknown, config?: Record<string, unknown>): unknown[] {
    if (!Array.isArray(content) || content.length < 2) {
      throw new InvalidGameContentError('el juego necesita al menos 2 parejas de contenido.');
    }
    if (content.length > 200) {
      throw new InvalidGameContentError('el juego admite como máximo 200 parejas.');
    }

    const mode = (config?.mode as MemoryMatchMode | undefined) ?? DEFAULT_CONFIG.mode;

    return content.map((item, index) =>
      mode === 'PAIRS' ? this.validateSimplePair(item, index) : this.validateOppositesPair(item, index),
    );
  }

  private validateOppositesPair(item: unknown, index: number): OppositesPair {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`la pareja en la posición ${index} no es un objeto válido.`);
    }

    const pair = item as Record<string, unknown>;

    if (
      !isNonEmptyString(pair.posTitle, MAX_TITLE_LENGTH) ||
      !isNonEmptyString(pair.negTitle, MAX_TITLE_LENGTH)
    ) {
      throw new InvalidGameContentError(
        `la pareja en la posición ${index} necesita posTitle y negTitle (máximo ${MAX_TITLE_LENGTH} caracteres).`,
      );
    }
    if (
      !isNonEmptyString(pair.posDescription, MAX_DESCRIPTION_LENGTH) ||
      !isNonEmptyString(pair.negDescription, MAX_DESCRIPTION_LENGTH)
    ) {
      throw new InvalidGameContentError(
        `la pareja en la posición ${index} necesita posDescription y negDescription (máximo ${MAX_DESCRIPTION_LENGTH} caracteres).`,
      );
    }
    if (
      !isNullableString(pair.posImageUrl, MAX_IMAGE_URL_LENGTH) ||
      !isNullableString(pair.negImageUrl, MAX_IMAGE_URL_LENGTH)
    ) {
      throw new InvalidGameContentError(
        `la pareja en la posición ${index} tiene una imagen inválida.`,
      );
    }

    return {
      mode: 'OPPOSITES',
      pairId: isNonEmptyString(pair.pairId, 60) ? pair.pairId : `pair-${index}`,
      posTitle: pair.posTitle.trim(),
      posDescription: pair.posDescription.trim(),
      posImageUrl: pair.posImageUrl,
      negTitle: pair.negTitle.trim(),
      negDescription: pair.negDescription.trim(),
      negImageUrl: pair.negImageUrl,
    };
  }

  private validateSimplePair(item: unknown, index: number): SimplePair {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`la pareja en la posición ${index} no es un objeto válido.`);
    }

    const pair = item as Record<string, unknown>;

    if (!isNonEmptyString(pair.label, MAX_TITLE_LENGTH)) {
      throw new InvalidGameContentError(
        `la pareja en la posición ${index} necesita label (máximo ${MAX_TITLE_LENGTH} caracteres).`,
      );
    }
    if (!isNonEmptyString(pair.imageUrl, MAX_IMAGE_URL_LENGTH)) {
      throw new InvalidGameContentError(
        `la pareja en la posición ${index} necesita imageUrl.`,
      );
    }

    return {
      mode: 'PAIRS',
      pairId: isNonEmptyString(pair.pairId, 60) ? pair.pairId : `pair-${index}`,
      imageUrl: pair.imageUrl,
      label: pair.label.trim(),
    };
  }
}
