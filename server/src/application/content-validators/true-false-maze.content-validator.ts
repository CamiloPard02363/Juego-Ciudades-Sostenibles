import { Injectable } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type { ContentValidator } from './content-validator.port.js';

/**
 * Una afirmación del laberinto: el jugador la lee y corre hacia la sala
 * VERDADERO o la sala FALSO del mapa. `explanation` se muestra después de
 * responder, acierte o no — es lo que convierte el error en aprendizaje.
 */
export interface TrueFalseMazeQuestion {
  questionId: string;
  statement: string;
  answer: boolean;
  explanation?: string;
}

/**
 * Escenario visual del juego. Hoy solo existe la nave espacial (robot vs.
 * medusas galácticas); un tema nuevo agrega su valor acá y su set de
 * sprites en el cliente, sin tocar la mecánica.
 */
export type TrueFalseMazeSkin = 'NAVE_ESPACIAL';
const VALID_SKINS: readonly TrueFalseMazeSkin[] = ['NAVE_ESPACIAL'];

export interface TrueFalseMazeConfig {
  skin: TrueFalseMazeSkin;
  /** Vidas del robot; se pierde una al responder mal o al chocar con una medusa. */
  lives: number;
  /** Cuántas medusas recorren la nave (1-4). */
  enemyCount: number;
  /** Velocidad relativa de las medusas (1 = lenta, 3 = rápida). */
  enemySpeed: number;
  /** Cada cuántos segundos cambian de lugar las salas VERDADERO/FALSO; 0 = solo al cambiar de pregunta. */
  relocateSeconds: number;
  /** Baraja el orden de las preguntas en cada partida. */
  shuffleQuestions: boolean;
  /** Activa el "sabotaje": apagones breves donde solo se ve alrededor del robot. */
  lightsOut: boolean;
}

const DEFAULT_CONFIG: TrueFalseMazeConfig = {
  skin: 'NAVE_ESPACIAL',
  lives: 3,
  enemyCount: 3,
  enemySpeed: 2,
  relocateSeconds: 20,
  shuffleQuestions: true,
  lightsOut: true,
};

const MIN_RELOCATE_SECONDS = 10;
const MAX_RELOCATE_SECONDS = 60;
/** Con menos de 3 afirmaciones la partida termina antes de que el mapa cobre sentido. */
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 30;
const MIN_STATEMENT_LENGTH = 5;
/** Tope pensado para que la afirmación quepa en el panel del juego sin scroll en móvil. */
const MAX_STATEMENT_LENGTH = 160;
const MAX_EXPLANATION_LENGTH = 240;
const MAX_QUESTION_ID_LENGTH = 60;

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Valida config y content para TRUE_FALSE_MAZE — laberinto de un jugador
 * donde cada afirmación se responde llegando a la sala VERDADERO o FALSO
 * mientras se esquivan enemigos. Las afirmaciones son del creador del juego;
 * el mapa y los personajes los pone el escenario (`skin`).
 */
@Injectable()
export class TrueFalseMazeContentValidator implements ContentValidator {
  validateConfig(config: unknown): Record<string, unknown> {
    const raw = (config ?? {}) as Partial<Record<keyof TrueFalseMazeConfig, unknown>>;

    const skin = raw.skin ?? DEFAULT_CONFIG.skin;
    if (!VALID_SKINS.includes(skin as TrueFalseMazeSkin)) {
      throw new InvalidGameContentError(`skin debe ser uno de: ${VALID_SKINS.join(', ')}.`);
    }

    const lives = raw.lives ?? DEFAULT_CONFIG.lives;
    if (!isIntegerInRange(lives, 1, 5)) {
      throw new InvalidGameContentError('lives debe ser un entero entre 1 y 5.');
    }

    const enemyCount = raw.enemyCount ?? DEFAULT_CONFIG.enemyCount;
    if (!isIntegerInRange(enemyCount, 1, 4)) {
      throw new InvalidGameContentError('enemyCount debe ser un entero entre 1 y 4.');
    }

    const enemySpeed = raw.enemySpeed ?? DEFAULT_CONFIG.enemySpeed;
    if (!isIntegerInRange(enemySpeed, 1, 3)) {
      throw new InvalidGameContentError('enemySpeed debe ser un entero entre 1 y 3.');
    }

    const relocateSeconds = raw.relocateSeconds ?? DEFAULT_CONFIG.relocateSeconds;
    if (relocateSeconds !== 0 && !isIntegerInRange(relocateSeconds, MIN_RELOCATE_SECONDS, MAX_RELOCATE_SECONDS)) {
      throw new InvalidGameContentError(
        `relocateSeconds debe ser 0 (sin cambios de lugar) o un entero entre ${MIN_RELOCATE_SECONDS} y ${MAX_RELOCATE_SECONDS}.`,
      );
    }

    const shuffleQuestions = raw.shuffleQuestions ?? DEFAULT_CONFIG.shuffleQuestions;
    if (typeof shuffleQuestions !== 'boolean') {
      throw new InvalidGameContentError('shuffleQuestions debe ser verdadero o falso.');
    }

    const lightsOut = raw.lightsOut ?? DEFAULT_CONFIG.lightsOut;
    if (typeof lightsOut !== 'boolean') {
      throw new InvalidGameContentError('lightsOut debe ser verdadero o falso.');
    }

    return { skin, lives, enemyCount, enemySpeed, relocateSeconds, shuffleQuestions, lightsOut };
  }

  validateContent(content: unknown): unknown[] {
    if (!Array.isArray(content) || content.length < MIN_QUESTIONS) {
      throw new InvalidGameContentError(`el laberinto necesita al menos ${MIN_QUESTIONS} afirmaciones.`);
    }
    if (content.length > MAX_QUESTIONS) {
      throw new InvalidGameContentError(`el laberinto admite como máximo ${MAX_QUESTIONS} afirmaciones.`);
    }

    const questions = content.map((item, index) => this.validateQuestion(item, index));

    const ids = new Set<string>();
    const statements = new Set<string>();
    for (const question of questions) {
      if (ids.has(question.questionId)) {
        throw new InvalidGameContentError(`el questionId "${question.questionId}" está repetido.`);
      }
      ids.add(question.questionId);

      const normalized = question.statement.toLocaleLowerCase('es');
      if (statements.has(normalized)) {
        throw new InvalidGameContentError(`la afirmación "${question.statement}" está repetida.`);
      }
      statements.add(normalized);
    }

    if (!questions.some((question) => question.answer) || !questions.some((question) => !question.answer)) {
      throw new InvalidGameContentError(
        'incluye al menos una afirmación verdadera y una falsa: si todas tienen la misma respuesta, el juego se resuelve sin leer.',
      );
    }

    return questions;
  }

  private validateQuestion(item: unknown, index: number): TrueFalseMazeQuestion {
    const position = index + 1;
    if (typeof item !== 'object' || item === null) {
      throw new InvalidGameContentError(`la afirmación ${position} no es un objeto válido.`);
    }

    const raw = item as Record<string, unknown>;
    const statement = typeof raw.statement === 'string' ? raw.statement.trim() : '';
    if (statement.length < MIN_STATEMENT_LENGTH || statement.length > MAX_STATEMENT_LENGTH) {
      throw new InvalidGameContentError(
        `la afirmación ${position} debe tener entre ${MIN_STATEMENT_LENGTH} y ${MAX_STATEMENT_LENGTH} caracteres.`,
      );
    }

    if (typeof raw.answer !== 'boolean') {
      throw new InvalidGameContentError(`la afirmación ${position} necesita su respuesta: verdadera o falsa.`);
    }

    if (raw.explanation !== undefined && raw.explanation !== null && typeof raw.explanation !== 'string') {
      throw new InvalidGameContentError(`la explicación de la afirmación ${position} debe ser texto.`);
    }
    // Una explicación vacía (ej. un borrador de IA sin dato) se omite en vez
    // de rechazar todo el juego: es opcional.
    const explanation = typeof raw.explanation === 'string' ? raw.explanation.trim() : '';
    if (explanation.length > MAX_EXPLANATION_LENGTH) {
      throw new InvalidGameContentError(
        `la explicación de la afirmación ${position} admite como máximo ${MAX_EXPLANATION_LENGTH} caracteres.`,
      );
    }

    const questionId =
      typeof raw.questionId === 'string' &&
      raw.questionId.trim().length > 0 &&
      raw.questionId.length <= MAX_QUESTION_ID_LENGTH
        ? raw.questionId.trim()
        : `q-${position}`;

    return {
      questionId,
      statement,
      answer: raw.answer,
      ...(explanation ? { explanation } : {}),
    };
  }
}
