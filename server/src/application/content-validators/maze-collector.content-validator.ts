import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

export type MazeCollectorDifficulty = 'LOW' | 'MEDIUM' | 'HIGH';
const VALID_DIFFICULTIES: readonly MazeCollectorDifficulty[] = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * Pregunta de opción múltiple asociada a un ítem: al recolectarlo, el juego
 * se pausa y la muestra antes de sumar el punto. A diferencia de Snakes &
 * Ladders (multiplayer), acá el cliente sí recibe `correctOptionIndex` desde
 * el inicio — MAZE_COLLECTOR es de un solo jugador, sin competencia ni
 * apuesta, así que ocultar la respuesta en el servidor sería sobre-ingeniería.
 */
export interface MazeCollectorQuestion {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  difficulty?: MazeCollectorDifficulty;
}

export type MazeCollectorWasteType = 'PLASTIC' | 'PAPER' | 'GLASS';
const VALID_WASTE_TYPES: readonly MazeCollectorWasteType[] = ['PLASTIC', 'PAPER', 'GLASS'];

/**
 * Un objeto coleccionable del laberinto: reemplaza la "pastilla" genérica
 * por un concepto temático, ej. un envase de vidrio en un juego de
 * reciclaje, con su ícono, color y un dato educativo opcional.
 */
export interface MazeCollectorItem {
  itemId: string;
  label: string;
  /** Nombre de un ícono del catálogo que resuelve el cliente (ver DOMINO_ICONS en el front). */
  icon: string;
  /** Color hex #rgb o #rrggbb con el que se pinta el ícono. */
  color: string;
  /** Dato educativo breve mostrado al recolectar el ítem, si lo tiene. */
  fact?: string;
  /** Pregunta opcional de sostenibilidad mostrada al recolectar el ítem. */
  question?: MazeCollectorQuestion;
  /** Cambia el puntaje del ítem (ver WASTE_POINTS en el cliente); sin esto, vale el puntaje por defecto. */
  wasteType?: MazeCollectorWasteType;
  /** Marca este ítem como el PowerUpRecycling: al recogerlo activa "Super-Recogida". */
  isPowerUp?: boolean;
}

export type MazeLayout = 'CLASSIC' | 'CROSS' | 'SPIRAL' | 'CITY';
const VALID_LAYOUTS: readonly MazeLayout[] = ['CLASSIC', 'CROSS', 'SPIRAL', 'CITY'];

export interface MazeCollectorConfig {
  layout: MazeLayout;
  /** Vidas del jugador; cada contacto con un enemigo resta una. */
  lives: number;
  /** Velocidad relativa de los enemigos (1 = lenta, 3 = rápida). */
  enemySpeed: number;
  /** Nombre temático del personaje jugador, ej. "Camión de reciclaje". */
  collectorLabel: string;
  collectorIcon: string;
  /** Nombre temático de los enemigos, ej. "Nube de contaminación". */
  enemyLabel: string;
  enemyIcon: string;
  /** Solo aplica con layout CITY: pregunta disparada al entrar a la zona 'school'. */
  schoolQuestion?: MazeCollectorQuestion;
  /** Solo aplica con layout CITY: pregunta disparada al entrar a la zona 'recycling_center'. */
  recyclingQuestion?: MazeCollectorQuestion;
}

const DEFAULT_CONFIG: Omit<MazeCollectorConfig, 'collectorLabel' | 'collectorIcon' | 'enemyLabel' | 'enemyIcon'> = {
  layout: 'CLASSIC',
  lives: 3,
  enemySpeed: 2,
};

const MAX_LABEL_LENGTH = 60;
const MAX_ICON_LENGTH = 60;
const MAX_FACT_LENGTH = 200;
const MAX_PROMPT_LENGTH = 300;
const MAX_OPTION_LENGTH = 120;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
/** Menos de 4 objetos deja el laberinto sin objetivo real de recorrido. */
const MIN_ITEMS = 4;
/** Más de 16 no entra de forma legible en ninguno de los 3 layouts fijos. */
const MAX_ITEMS = 16;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

/**
 * Valida config y content para MAZE_COLLECTOR — un jugador recorre un
 * laberinto recolectando objetos temáticos mientras esquiva enemigos; la
 * narrativa (quién recolecta, qué esquiva) es enteramente de datos, nunca
 * hardcodeada acá.
 */
@Injectable()
export class MazeCollectorContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<MazeCollectorConfig>;

    const layout = raw.layout ?? DEFAULT_CONFIG.layout;
    if (!VALID_LAYOUTS.includes(layout)) {
      throw new InvalidGameContentError(`layout debe ser uno de: ${VALID_LAYOUTS.join(', ')}.`);
    }

    const lives = raw.lives ?? DEFAULT_CONFIG.lives;
    if (!Number.isInteger(lives) || lives < 1 || lives > 5) {
      throw new InvalidGameContentError('lives debe ser un entero entre 1 y 5.');
    }

    const enemySpeed = raw.enemySpeed ?? DEFAULT_CONFIG.enemySpeed;
    if (!Number.isInteger(enemySpeed) || enemySpeed < 1 || enemySpeed > 3) {
      throw new InvalidGameContentError('enemySpeed debe ser un entero entre 1 y 3.');
    }

    if (!isNonEmptyString(raw.collectorLabel, MAX_LABEL_LENGTH)) {
      throw new InvalidGameContentError(`collectorLabel es obligatorio (máximo ${MAX_LABEL_LENGTH} caracteres).`);
    }
    if (!isNonEmptyString(raw.collectorIcon, MAX_ICON_LENGTH)) {
      throw new InvalidGameContentError('collectorIcon es obligatorio.');
    }
    if (!isNonEmptyString(raw.enemyLabel, MAX_LABEL_LENGTH)) {
      throw new InvalidGameContentError(`enemyLabel es obligatorio (máximo ${MAX_LABEL_LENGTH} caracteres).`);
    }
    if (!isNonEmptyString(raw.enemyIcon, MAX_ICON_LENGTH)) {
      throw new InvalidGameContentError('enemyIcon es obligatorio.');
    }

    const schoolQuestion =
      raw.schoolQuestion !== undefined ? this.validateQuestion(raw.schoolQuestion, 'la zona Escuela') : undefined;
    const recyclingQuestion =
      raw.recyclingQuestion !== undefined
        ? this.validateQuestion(raw.recyclingQuestion, 'la zona Centro de Reciclaje')
        : undefined;

    return {
      layout,
      lives,
      enemySpeed,
      collectorLabel: raw.collectorLabel!.trim(),
      collectorIcon: raw.collectorIcon!.trim(),
      enemyLabel: raw.enemyLabel!.trim(),
      enemyIcon: raw.enemyIcon!.trim(),
      ...(schoolQuestion ? { schoolQuestion } : {}),
      ...(recyclingQuestion ? { recyclingQuestion } : {}),
    };
  }

  validateContent(content: unknown): unknown[] {
    if (!Array.isArray(content) || content.length < MIN_ITEMS) {
      throw new InvalidGameContentError(`el recolector necesita al menos ${MIN_ITEMS} objetos.`);
    }
    if (content.length > MAX_ITEMS) {
      throw new InvalidGameContentError(`el recolector admite como máximo ${MAX_ITEMS} objetos.`);
    }

    const items = content.map((item, index) => this.validateItem(item, index));

    const ids = new Set<string>();
    for (const item of items) {
      if (ids.has(item.itemId)) {
        throw new InvalidGameContentError(`el itemId "${item.itemId}" está repetido.`);
      }
      ids.add(item.itemId);
    }

    return items;
  }

  private validateItem(item: unknown, index: number): MazeCollectorItem {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`el objeto en la posición ${index} no es un objeto válido.`);
    }

    const raw = item as Record<string, unknown>;

    if (!isNonEmptyString(raw.label, MAX_LABEL_LENGTH)) {
      throw new InvalidGameContentError(
        `el objeto en la posición ${index} necesita label (máximo ${MAX_LABEL_LENGTH} caracteres).`,
      );
    }
    if (!isNonEmptyString(raw.icon, MAX_ICON_LENGTH)) {
      throw new InvalidGameContentError(`el objeto en la posición ${index} necesita un ícono.`);
    }
    if (typeof raw.color !== 'string' || !HEX_COLOR.test(raw.color.trim())) {
      throw new InvalidGameContentError(
        `el objeto en la posición ${index} necesita un color hexadecimal válido (ej. #22c55e).`,
      );
    }
    if (raw.fact !== undefined && !isNonEmptyString(raw.fact, MAX_FACT_LENGTH)) {
      throw new InvalidGameContentError(
        `el objeto en la posición ${index} tiene un "fact" inválido (máximo ${MAX_FACT_LENGTH} caracteres).`,
      );
    }

    const question =
      raw.question !== undefined ? this.validateQuestion(raw.question, `el objeto en la posición ${index}`) : undefined;

    if (raw.wasteType !== undefined && !VALID_WASTE_TYPES.includes(raw.wasteType as MazeCollectorWasteType)) {
      throw new InvalidGameContentError(
        `el objeto en la posición ${index} tiene un wasteType inválido (usa: ${VALID_WASTE_TYPES.join(', ')}).`,
      );
    }

    return {
      itemId: isNonEmptyString(raw.itemId, 60) ? raw.itemId : `item-${index}`,
      label: raw.label.trim(),
      icon: raw.icon.trim(),
      color: raw.color.trim(),
      ...(raw.fact !== undefined ? { fact: (raw.fact as string).trim() } : {}),
      ...(question ? { question } : {}),
      ...(raw.wasteType !== undefined ? { wasteType: raw.wasteType as MazeCollectorWasteType } : {}),
      ...(raw.isPowerUp === true ? { isPowerUp: true } : {}),
    };
  }

  /** Reusado tanto para la pregunta de un ítem como para las preguntas de zona (Escuela/Centro de Reciclaje) de config. */
  private validateQuestion(value: unknown, context: string): MazeCollectorQuestion {
    if (typeof value !== 'object' || value === null) {
      throw new InvalidGameContentError(`la pregunta de ${context} no es un objeto válido.`);
    }
    const raw = value as Record<string, unknown>;

    if (!isNonEmptyString(raw.prompt, MAX_PROMPT_LENGTH)) {
      throw new InvalidGameContentError(`la pregunta de ${context} necesita un prompt (máximo ${MAX_PROMPT_LENGTH} caracteres).`);
    }
    if (!Array.isArray(raw.options) || raw.options.length < MIN_OPTIONS || raw.options.length > MAX_OPTIONS) {
      throw new InvalidGameContentError(
        `la pregunta de ${context} necesita entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones.`,
      );
    }
    const options = raw.options.map((option, optionIndex) => {
      if (!isNonEmptyString(option, MAX_OPTION_LENGTH)) {
        throw new InvalidGameContentError(
          `la opción ${optionIndex} de la pregunta de ${context} es inválida (máximo ${MAX_OPTION_LENGTH} caracteres).`,
        );
      }
      return option.trim();
    });

    if (
      !Number.isInteger(raw.correctOptionIndex) ||
      (raw.correctOptionIndex as number) < 0 ||
      (raw.correctOptionIndex as number) >= options.length
    ) {
      throw new InvalidGameContentError(
        `la pregunta de ${context} necesita correctOptionIndex dentro del rango de sus opciones.`,
      );
    }

    if (raw.difficulty !== undefined && !VALID_DIFFICULTIES.includes(raw.difficulty as MazeCollectorDifficulty)) {
      throw new InvalidGameContentError(
        `la pregunta de ${context} tiene un difficulty inválido (usa: ${VALID_DIFFICULTIES.join(', ')}).`,
      );
    }

    return {
      prompt: (raw.prompt as string).trim(),
      options,
      correctOptionIndex: raw.correctOptionIndex as number,
      ...(raw.difficulty !== undefined ? { difficulty: raw.difficulty as MazeCollectorDifficulty } : {}),
    };
  }
}
