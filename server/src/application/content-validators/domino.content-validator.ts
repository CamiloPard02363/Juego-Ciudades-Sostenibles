import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

/**
 * Un concepto del dominó: reemplaza al número de una mitad de ficha. En vez
 * de "5 puntos" la mitad muestra, por ejemplo, "Paneles Solares" con su ícono
 * y su color.
 */
export interface DominoConcept {
  conceptId: string;
  label: string;
  /** Nombre de un ícono del catálogo que resuelve el cliente (ver DOMINO_ICONS en el front). */
  icon: string;
  /** Color hex #rgb o #rrggbb con el que se pinta el ícono. */
  color: string;
}

export interface DominoConfig {
  /** Fichas que recibe el jugador al repartir; el resto queda en el pozo. */
  handSize: number;
}

const DEFAULT_CONFIG: DominoConfig = {
  handSize: 7,
};

const MAX_LABEL_LENGTH = 60;
const MAX_ICON_LENGTH = 60;
/**
 * Mínimo 6: con N conceptos el set completo tiene N*(N+1)/2 fichas únicas
 * (todas las combinaciones a<=b). Con 6 conceptos son 21 fichas — el tamaño
 * del dominó "double-six" tradicional, que es la referencia de la mecánica.
 */
const MIN_CONCEPTS = 6;
/** Con 10 conceptos el set llega a 55 fichas; más allá el tablero deja de ser jugable en pantalla. */
const MAX_CONCEPTS = 10;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

/**
 * Valida config y content para DOMINO — dominó temático de un jugador contra
 * el tablero: cada mitad de ficha es un concepto en vez de un número, y la
 * mecánica (empatar extremos abiertos) es la misma del dominó tradicional.
 */
@Injectable()
export class DominoContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<DominoConfig>;
    const handSize = raw.handSize ?? DEFAULT_CONFIG.handSize;

    if (!Number.isInteger(handSize) || handSize < 3 || handSize > 12) {
      throw new InvalidGameContentError('handSize debe ser un entero entre 3 y 12.');
    }

    return { handSize };
  }

  validateContent(content: unknown): unknown[] {
    if (!Array.isArray(content) || content.length < MIN_CONCEPTS) {
      throw new InvalidGameContentError(`el dominó necesita al menos ${MIN_CONCEPTS} conceptos.`);
    }
    if (content.length > MAX_CONCEPTS) {
      throw new InvalidGameContentError(`el dominó admite como máximo ${MAX_CONCEPTS} conceptos.`);
    }

    const concepts = content.map((item, index) => this.validateConcept(item, index));

    // Dos conceptos con el mismo nombre harían fichas indistinguibles en el
    // tablero: el jugador no podría saber cuál extremo empata con cuál.
    const labels = new Set<string>();
    for (const concept of concepts) {
      const key = concept.label.toLowerCase();
      if (labels.has(key)) {
        throw new InvalidGameContentError(`el concepto "${concept.label}" está repetido.`);
      }
      labels.add(key);
    }

    return concepts;
  }

  private validateConcept(item: unknown, index: number): DominoConcept {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`el concepto en la posición ${index} no es un objeto válido.`);
    }

    const concept = item as Record<string, unknown>;

    if (!isNonEmptyString(concept.label, MAX_LABEL_LENGTH)) {
      throw new InvalidGameContentError(
        `el concepto en la posición ${index} necesita label (máximo ${MAX_LABEL_LENGTH} caracteres).`,
      );
    }
    if (!isNonEmptyString(concept.icon, MAX_ICON_LENGTH)) {
      throw new InvalidGameContentError(`el concepto en la posición ${index} necesita un ícono.`);
    }
    if (typeof concept.color !== 'string' || !HEX_COLOR.test(concept.color.trim())) {
      throw new InvalidGameContentError(
        `el concepto en la posición ${index} necesita un color hexadecimal válido (ej. #22c55e).`,
      );
    }

    return {
      conceptId: isNonEmptyString(concept.conceptId, 60) ? concept.conceptId : `concept-${index}`,
      label: concept.label.trim(),
      icon: concept.icon.trim(),
      color: concept.color.trim(),
    };
  }
}
