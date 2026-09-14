import { describe, expect, it } from 'vitest';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { SnakesLaddersContentValidator } from './snakes-ladders.content-validator.js';

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    boardSize: 30,
    turnDurationSeconds: 45,
    ladders: [{ from: 4, to: 14 }],
    snakes: [{ from: 27, to: 9 }],
    ...overrides,
  };
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    cellNumber: 4,
    triggerType: 'LADDER',
    prompt: '¿Qué energía no se agota con el uso?',
    options: ['Renovable', 'Fósil'],
    correctOptionIndex: 0,
    ...overrides,
  };
}

function fiveCellQuestions() {
  return Array.from({ length: 5 }, (_, i) => ({
    cellNumber: 20 + i,
    triggerType: 'CELL',
    prompt: `Pregunta de casilla ${i}`,
    options: ['A', 'B'],
    correctOptionIndex: 0,
  }));
}

describe('SnakesLaddersContentValidator', () => {
  const validator = new SnakesLaddersContentValidator();

  describe('validateConfig', () => {
    it('acepta un config válido con defaults', () => {
      const config = validator.validateConfig({ boardSize: 30, ladders: [{ from: 4, to: 14 }] });
      expect(config).toEqual({
        boardSize: 30,
        turnDurationSeconds: 45,
        ladders: [{ from: 4, to: 14 }],
        snakes: [],
      });
    });

    it('rechaza boardSize fuera de rango', () => {
      expect(() => validator.validateConfig(validConfig({ boardSize: 10 }))).toThrow(InvalidGameContentError);
      expect(() => validator.validateConfig(validConfig({ boardSize: 50 }))).toThrow(InvalidGameContentError);
    });

    it('rechaza una escalera con to <= from', () => {
      expect(() =>
        validator.validateConfig(validConfig({ ladders: [{ from: 10, to: 5 }] })),
      ).toThrow(InvalidGameContentError);
    });

    it('rechaza una serpiente con to >= from', () => {
      expect(() =>
        validator.validateConfig(validConfig({ snakes: [{ from: 5, to: 10 }] })),
      ).toThrow(InvalidGameContentError);
    });

    it('rechaza cuando no hay ni escaleras ni serpientes', () => {
      expect(() => validator.validateConfig(validConfig({ ladders: [], snakes: [] }))).toThrow(
        InvalidGameContentError,
      );
    });

    it('rechaza una casilla usada como origen de dos vínculos', () => {
      expect(() =>
        validator.validateConfig(
          validConfig({ ladders: [{ from: 4, to: 14 }, { from: 4, to: 18 }] }),
        ),
      ).toThrow(InvalidGameContentError);
    });

    it('rechaza cuando el destino de un vínculo es el origen de otro', () => {
      expect(() =>
        validator.validateConfig(
          validConfig({ ladders: [{ from: 4, to: 14 }], snakes: [{ from: 14, to: 6 }] }),
        ),
      ).toThrow(InvalidGameContentError);
    });
  });

  describe('validateContent', () => {
    it('exige el config ya validado', () => {
      expect(() => validator.validateContent([question(), ...fiveCellQuestions()])).toThrow(
        InvalidGameContentError,
      );
    });

    it('rechaza cuando falta el reto de una escalera declarada', () => {
      const config = validator.validateConfig(validConfig());
      expect(() => validator.validateContent(fiveCellQuestions(), config)).toThrow(InvalidGameContentError);
    });

    it('rechaza cuando falta el reto de una serpiente declarada', () => {
      const config = validator.validateConfig(validConfig());
      const content = [question(), ...fiveCellQuestions()];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('rechaza menos del mínimo de retos CELL', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        question(),
        question({ cellNumber: 27, triggerType: 'SNAKE', prompt: 'Reto de serpiente' }),
        ...fiveCellQuestions().slice(0, 2),
      ];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('rechaza un cellNumber duplicado dentro del mismo triggerType', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        question(),
        question({ cellNumber: 27, triggerType: 'SNAKE', prompt: 'Reto de serpiente' }),
        ...fiveCellQuestions(),
        { ...fiveCellQuestions()[0] },
      ];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('acepta un caso completo válido', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        question(),
        question({ cellNumber: 27, triggerType: 'SNAKE', prompt: 'Reto de serpiente' }),
        ...fiveCellQuestions(),
      ];
      const result = validator.validateContent(content, config) as Array<Record<string, unknown>>;
      expect(result).toHaveLength(7);
    });

    it('rechaza correctOptionIndex fuera de rango', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        question({ correctOptionIndex: 5 }),
        question({ cellNumber: 27, triggerType: 'SNAKE', prompt: 'Reto de serpiente' }),
        ...fiveCellQuestions(),
      ];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });
  });
});
