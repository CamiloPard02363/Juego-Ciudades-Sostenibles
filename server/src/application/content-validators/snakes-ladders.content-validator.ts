import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

/** Una escalera (sube) o serpiente (baja) del tablero. */
export interface SnakesLaddersLink {
  from: number;
  to: number;
}

export interface SnakesLaddersConfig {
  /** Cantidad de casillas del tablero. */
  boardSize: number;
  /** Igual rol que en Dominó: cuánto dura cada turno en la sala en vivo. */
  turnDurationSeconds: number;
  ladders: SnakesLaddersLink[];
  snakes: SnakesLaddersLink[];
}

export type SnakesLaddersTriggerType = 'CELL' | 'LADDER' | 'SNAKE';
export type SnakesLaddersDifficulty = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Un reto asociado a una casilla concreta. `triggerType` dice si es una
 * casilla normal, la base de una escalera o la cabeza de una serpiente —
 * cada escalera/serpiente declarada en `config` debe tener exactamente un
 * reto LADDER/SNAKE que la respalde (ver `validateContent`).
 */
export interface SnakesLaddersQuestion {
  cellNumber: number;
  triggerType: SnakesLaddersTriggerType;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  difficulty?: SnakesLaddersDifficulty;
}

const DEFAULT_CONFIG: Pick<SnakesLaddersConfig, 'turnDurationSeconds'> = {
  turnDurationSeconds: 45,
};

const MIN_BOARD_SIZE = 25;
const MAX_BOARD_SIZE = 40;
const MAX_PROMPT_LENGTH = 300;
const MAX_OPTION_LENGTH = 120;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
/** Sin al menos algunas casillas normales con reto, el tablero se sentiría puro azar salvo por escaleras/serpientes. */
const MIN_CELL_QUESTIONS = 5;
const VALID_TRIGGER_TYPES: readonly SnakesLaddersTriggerType[] = ['CELL', 'LADDER', 'SNAKE'];
const VALID_DIFFICULTIES: readonly SnakesLaddersDifficulty[] = ['LOW', 'MEDIUM', 'HIGH'];

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isValidCell(value: unknown, boardSize: number): value is number {
  return Number.isInteger(value) && (value as number) >= 2 && (value as number) <= boardSize - 1;
}

/**
 * Valida config y content para SNAKES_LADDERS — el avance no depende del
 * puro azar: cada escalera y cada serpiente exige responder un reto antes
 * de subir o antes de resbalar, y ese reto vive en `content`, nunca
 * hardcodeado acá. La narrativa (Ciudad Sostenible u otra) es enteramente
 * de los `prompt`/`options` que traiga el contenido.
 */
@Injectable()
export class SnakesLaddersContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<SnakesLaddersConfig>;

    const boardSize = raw.boardSize;
    if (!Number.isInteger(boardSize) || boardSize! < MIN_BOARD_SIZE || boardSize! > MAX_BOARD_SIZE) {
      throw new InvalidGameContentError(
        `boardSize debe ser un entero entre ${MIN_BOARD_SIZE} y ${MAX_BOARD_SIZE}.`,
      );
    }

    const turnDurationSeconds = raw.turnDurationSeconds ?? DEFAULT_CONFIG.turnDurationSeconds;
    if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 15 || turnDurationSeconds > 180) {
      throw new InvalidGameContentError('turnDurationSeconds debe ser un entero entre 15 y 180.');
    }

    const ladders = this.validateLinks(raw.ladders, boardSize!, 'ladders', (link) => link.to > link.from);
    const snakes = this.validateLinks(raw.snakes, boardSize!, 'snakes', (link) => link.to < link.from);

    if (ladders.length === 0 && snakes.length === 0) {
      throw new InvalidGameContentError('el tablero necesita al menos una escalera o una serpiente.');
    }

    // Ninguna casilla puede ser el origen de más de un vínculo, ni ser
    // origen de uno y destino de otro a la vez — evita encadenamientos
    // ambiguos (¿subo la escalera o caigo por la serpiente que empieza ahí?).
    const usedCells = new Set<number>();
    for (const link of [...ladders, ...snakes]) {
      if (usedCells.has(link.from)) {
        throw new InvalidGameContentError(`la casilla ${link.from} ya es el origen de otra escalera/serpiente.`);
      }
      usedCells.add(link.from);
    }
    for (const link of [...ladders, ...snakes]) {
      for (const other of [...ladders, ...snakes]) {
        if (other !== link && other.from === link.to) {
          throw new InvalidGameContentError(
            `la casilla ${link.to} no puede ser destino de una escalera/serpiente y origen de otra a la vez.`,
          );
        }
      }
    }

    return { boardSize, turnDurationSeconds, ladders, snakes };
  }

  private validateLinks(
    value: unknown,
    boardSize: number,
    fieldName: string,
    directionCheck: (link: SnakesLaddersLink) => boolean,
  ): SnakesLaddersLink[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      throw new InvalidGameContentError(`${fieldName} debe ser un arreglo.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new InvalidGameContentError(`${fieldName}[${index}] no es un objeto válido.`);
      }
      const raw = item as Record<string, unknown>;

      if (!isValidCell(raw.from, boardSize) || !isValidCell(raw.to, boardSize)) {
        throw new InvalidGameContentError(
          `${fieldName}[${index}] necesita "from" y "to" enteros entre 2 y ${boardSize - 1}.`,
        );
      }
      const link = { from: raw.from as number, to: raw.to as number };
      if (!directionCheck(link)) {
        throw new InvalidGameContentError(
          `${fieldName}[${index}]: la dirección de "from" (${link.from}) a "to" (${link.to}) no es válida para ${fieldName}.`,
        );
      }
      return link;
    });
  }

  validateContent(content: unknown, config?: Record<string, unknown>): unknown[] {
    if (!config) {
      throw new InvalidGameContentError('el contenido de SNAKES_LADDERS necesita el config ya validado.');
    }
    if (!Array.isArray(content) || content.length === 0) {
      throw new InvalidGameContentError('el tablero necesita al menos un reto en content.');
    }

    const ladders = config.ladders as SnakesLaddersLink[];
    const snakes = config.snakes as SnakesLaddersLink[];

    const questions = content.map((item, index) => this.validateQuestion(item, index));

    const seenByType = new Map<SnakesLaddersTriggerType, Set<number>>();
    for (const question of questions) {
      const seen = seenByType.get(question.triggerType) ?? new Set<number>();
      if (seen.has(question.cellNumber)) {
        throw new InvalidGameContentError(
          `hay más de un reto ${question.triggerType} para la casilla ${question.cellNumber}.`,
        );
      }
      seen.add(question.cellNumber);
      seenByType.set(question.triggerType, seen);
    }

    const ladderCells = new Set(ladders.map((l) => l.from));
    const snakeCells = new Set(snakes.map((s) => s.from));
    const laddersCovered = seenByType.get('LADDER') ?? new Set<number>();
    const snakesCovered = seenByType.get('SNAKE') ?? new Set<number>();

    for (const cell of ladderCells) {
      if (!laddersCovered.has(cell)) {
        throw new InvalidGameContentError(`falta el reto de la escalera que empieza en la casilla ${cell}.`);
      }
    }
    for (const cell of snakeCells) {
      if (!snakesCovered.has(cell)) {
        throw new InvalidGameContentError(`falta el reto de la serpiente que empieza en la casilla ${cell}.`);
      }
    }

    const cellQuestionCount = (seenByType.get('CELL') ?? new Set()).size;
    if (cellQuestionCount < MIN_CELL_QUESTIONS) {
      throw new InvalidGameContentError(
        `se necesitan al menos ${MIN_CELL_QUESTIONS} retos de tipo CELL (hay ${cellQuestionCount}).`,
      );
    }

    return questions;
  }

  private validateQuestion(item: unknown, index: number): SnakesLaddersQuestion {
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`el reto en la posición ${index} no es un objeto válido.`);
    }
    const raw = item as Record<string, unknown>;

    if (!Number.isInteger(raw.cellNumber) || (raw.cellNumber as number) < 1) {
      throw new InvalidGameContentError(`el reto en la posición ${index} necesita un cellNumber válido.`);
    }
    if (!VALID_TRIGGER_TYPES.includes(raw.triggerType as SnakesLaddersTriggerType)) {
      throw new InvalidGameContentError(
        `el reto en la posición ${index} necesita triggerType uno de: ${VALID_TRIGGER_TYPES.join(', ')}.`,
      );
    }
    if (!isNonEmptyString(raw.prompt, MAX_PROMPT_LENGTH)) {
      throw new InvalidGameContentError(
        `el reto en la posición ${index} necesita un prompt (máximo ${MAX_PROMPT_LENGTH} caracteres).`,
      );
    }
    if (!Array.isArray(raw.options) || raw.options.length < MIN_OPTIONS || raw.options.length > MAX_OPTIONS) {
      throw new InvalidGameContentError(
        `el reto en la posición ${index} necesita entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones.`,
      );
    }
    const options = raw.options.map((option, optionIndex) => {
      if (!isNonEmptyString(option, MAX_OPTION_LENGTH)) {
        throw new InvalidGameContentError(
          `la opción ${optionIndex} del reto en la posición ${index} es inválida (máximo ${MAX_OPTION_LENGTH} caracteres).`,
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
        `el reto en la posición ${index} necesita correctOptionIndex dentro del rango de sus opciones.`,
      );
    }

    if (raw.difficulty !== undefined && !VALID_DIFFICULTIES.includes(raw.difficulty as SnakesLaddersDifficulty)) {
      throw new InvalidGameContentError(
        `el reto en la posición ${index} tiene un difficulty inválido (usa: ${VALID_DIFFICULTIES.join(', ')}).`,
      );
    }

    return {
      cellNumber: raw.cellNumber as number,
      triggerType: raw.triggerType as SnakesLaddersTriggerType,
      prompt: (raw.prompt as string).trim(),
      options,
      correctOptionIndex: raw.correctOptionIndex as number,
      ...(raw.difficulty !== undefined ? { difficulty: raw.difficulty as SnakesLaddersDifficulty } : {}),
    };
  }
}
