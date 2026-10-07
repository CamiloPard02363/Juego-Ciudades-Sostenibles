import { describe, expect, it } from 'vitest';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { TrueFalseMazeContentValidator } from './true-false-maze.content-validator.js';

function question(overrides: Record<string, unknown> = {}) {
  return {
    questionId: 'q-sol',
    statement: 'El Sol es una estrella.',
    answer: true,
    explanation: 'Es una estrella enana amarilla.',
    ...overrides,
  };
}

function threeQuestions() {
  return [
    question(),
    question({ questionId: 'q-luna', statement: 'La Luna tiene luz propia.', answer: false }),
    question({ questionId: 'q-tierra', statement: 'La Tierra gira alrededor del Sol.', answer: true }),
  ];
}

describe('TrueFalseMazeContentValidator', () => {
  const validator = new TrueFalseMazeContentValidator();

  describe('validateConfig', () => {
    it('aplica los valores por defecto cuando no vienen', () => {
      expect(validator.validateConfig(undefined)).toEqual({
        skin: 'NAVE_ESPACIAL',
        lives: 3,
        enemyCount: 3,
        enemySpeed: 2,
        relocateSeconds: 20,
        shuffleQuestions: true,
        lightsOut: true,
      });
    });

    it('acepta un config completo válido', () => {
      const config = {
        skin: 'NAVE_ESPACIAL',
        lives: 5,
        enemyCount: 4,
        enemySpeed: 3,
        relocateSeconds: 0,
        shuffleQuestions: false,
        lightsOut: false,
      };
      expect(validator.validateConfig(config)).toEqual(config);
    });

    it.each([
      ['skin', { skin: 'SELVA' }],
      ['lives', { lives: 0 }],
      ['lives', { lives: 2.5 }],
      ['enemyCount', { enemyCount: 5 }],
      ['enemySpeed', { enemySpeed: 4 }],
      ['relocateSeconds', { relocateSeconds: 5 }],
      ['relocateSeconds', { relocateSeconds: 61 }],
      ['shuffleQuestions', { shuffleQuestions: 'sí' }],
      ['lightsOut', { lightsOut: 1 }],
    ])('rechaza %s inválido', (_field, config) => {
      expect(() => validator.validateConfig(config)).toThrow(InvalidGameContentError);
    });
  });

  describe('validateContent', () => {
    it('acepta y normaliza afirmaciones válidas', () => {
      const result = validator.validateContent([
        question({ statement: '  El Sol es una estrella.  ', explanation: '   ' }),
        question({ questionId: undefined, statement: 'La Luna tiene luz propia.', answer: false }),
        question({ questionId: 'q-tierra', statement: 'La Tierra gira alrededor del Sol.' }),
      ]);

      expect(result).toEqual([
        { questionId: 'q-sol', statement: 'El Sol es una estrella.', answer: true },
        {
          questionId: 'q-2',
          statement: 'La Luna tiene luz propia.',
          answer: false,
          explanation: 'Es una estrella enana amarilla.',
        },
        {
          questionId: 'q-tierra',
          statement: 'La Tierra gira alrededor del Sol.',
          answer: true,
          explanation: 'Es una estrella enana amarilla.',
        },
      ]);
    });

    it('exige al menos 3 afirmaciones', () => {
      expect(() => validator.validateContent(threeQuestions().slice(0, 2))).toThrow(/al menos 3/);
    });

    it('admite como máximo 30 afirmaciones', () => {
      const many = Array.from({ length: 31 }, (_, index) =>
        question({ questionId: `q-${index}`, statement: `Afirmación número ${index}`, answer: index % 2 === 0 }),
      );
      expect(() => validator.validateContent(many)).toThrow(/como máximo 30/);
    });

    it('exige que la respuesta sea booleana', () => {
      const questions = threeQuestions();
      questions[1] = question({ questionId: 'q-luna', statement: 'La Luna tiene luz propia.', answer: 'falso' });
      expect(() => validator.validateContent(questions)).toThrow(/verdadera o falsa/);
    });

    it('rechaza afirmaciones demasiado cortas o largas', () => {
      const short = threeQuestions();
      short[0] = question({ statement: 'Sí' });
      expect(() => validator.validateContent(short)).toThrow(/entre 5 y 160/);

      const long = threeQuestions();
      long[0] = question({ statement: 'a'.repeat(161) });
      expect(() => validator.validateContent(long)).toThrow(/entre 5 y 160/);
    });

    it('rechaza explicaciones demasiado largas', () => {
      const questions = threeQuestions();
      questions[0] = question({ explanation: 'a'.repeat(241) });
      expect(() => validator.validateContent(questions)).toThrow(/como máximo 240/);
    });

    it('rechaza ids y afirmaciones repetidas', () => {
      const repeatedId = threeQuestions();
      repeatedId[2] = question({ statement: 'Otra afirmación distinta.', answer: false });
      expect(() => validator.validateContent(repeatedId)).toThrow(/questionId "q-sol" está repetido/);

      const repeatedStatement = threeQuestions();
      repeatedStatement[2] = question({ questionId: 'q-copia', statement: 'el sol es una estrella.' });
      expect(() => validator.validateContent(repeatedStatement)).toThrow(/está repetida/);
    });

    it('exige al menos una afirmación verdadera y una falsa', () => {
      const allTrue = threeQuestions().map((item) => ({ ...item, answer: true }));
      expect(() => validator.validateContent(allTrue)).toThrow(/al menos una afirmación verdadera y una falsa/);
    });
  });
});
