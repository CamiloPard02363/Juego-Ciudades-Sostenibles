import { describe, expect, it } from 'vitest';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { DualQuestContentValidator } from './dual-quest.content-validator.js';

/**
 * Grid de 8x6 (mínimo permitido): fila 3 es toda muro salvo dos aberturas
 * (una solo-FIRE en col 2, una solo-WATER en col 5) para que cada rol tenga
 * su propio camino hacia la mitad inferior del mapa, donde vive corePosition.
 *
 *   row0: 0 0 0 0 0 0 0 0
 *   row1: 0 0 0 0 0 0 0 0
 *   row2: 0 0 0 0 0 0 0 0
 *   row3: 1 1 2 1 1 3 1 1
 *   row4: 0 0 0 0 0 0 0 0
 *   row5: 0 0 0 0 0 0 0 0
 */
function buildGrid(): number[][] {
  return [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 2, 1, 1, 3, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];
}

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    coreQuestion: '¿Cómo funciona el ciclo del agua?',
    gridCols: 8,
    gridRows: 6,
    grid: buildGrid(),
    fireStart: { row: 0, col: 0 },
    waterStart: { row: 0, col: 7 },
    corePosition: { row: 4, col: 4 },
    gates: [{ gateId: 'gate-1', position: { row: 1, col: 4 } }],
    triggers: [
      {
        triggerId: 'trigger-1',
        kind: 'SWITCH',
        activatedByRole: 'WATER',
        switchPosition: { row: 0, col: 6 },
        gateId: 'gate-1',
      },
    ],
    ...overrides,
  };
}

function gem(overrides: Record<string, unknown> = {}) {
  return { gemId: 'gem-1', role: 'FIRE', position: { row: 0, col: 1 }, label: 'Evaporación', order: 1, ...overrides };
}

describe('DualQuestContentValidator', () => {
  const validator = new DualQuestContentValidator();

  describe('validateConfig', () => {
    it('acepta un config válido', () => {
      const config = validator.validateConfig(validConfig());
      expect(config).toMatchObject({ gridCols: 8, gridRows: 6 });
    });

    it('rechaza gridCols/gridRows fuera de rango', () => {
      expect(() => validator.validateConfig(validConfig({ gridCols: 3 }))).toThrow(InvalidGameContentError);
      expect(() => validator.validateConfig(validConfig({ gridRows: 40 }))).toThrow(InvalidGameContentError);
    });

    it('rechaza un grid con dimensiones inconsistentes', () => {
      const badGrid = buildGrid();
      badGrid.pop();
      expect(() => validator.validateConfig(validConfig({ grid: badGrid }))).toThrow(InvalidGameContentError);
    });

    it('rechaza fireStart sobre una casilla solo-WATER', () => {
      expect(() => validator.validateConfig(validConfig({ fireStart: { row: 3, col: 5 } }))).toThrow(
        InvalidGameContentError,
      );
    });

    it('rechaza corePosition sobre un muro', () => {
      expect(() => validator.validateConfig(validConfig({ corePosition: { row: 3, col: 0 } }))).toThrow(
        InvalidGameContentError,
      );
    });

    it('rechaza una compuerta sin ningún trigger que la abra', () => {
      const config = validConfig({
        gates: [
          { gateId: 'gate-1', position: { row: 1, col: 4 } },
          { gateId: 'gate-2', position: { row: 2, col: 4 } },
        ],
      });
      expect(() => validator.validateConfig(config)).toThrow(InvalidGameContentError);
    });

    it('rechaza un trigger QUESTION sin opciones válidas', () => {
      const config = validConfig({
        triggers: [
          {
            triggerId: 'trigger-1',
            kind: 'QUESTION',
            activatedByRole: 'WATER',
            switchPosition: { row: 0, col: 6 },
            gateId: 'gate-1',
            prompt: '¿Qué es la condensación?',
            options: ['Solo una'],
            correctOptionIndex: 0,
          },
        ],
      });
      expect(() => validator.validateConfig(config)).toThrow(InvalidGameContentError);
    });

    it('acepta un trigger QUESTION válido', () => {
      const config = validator.validateConfig(
        validConfig({
          triggers: [
            {
              triggerId: 'trigger-1',
              kind: 'QUESTION',
              activatedByRole: 'WATER',
              switchPosition: { row: 0, col: 6 },
              gateId: 'gate-1',
              prompt: '¿Qué es la condensación?',
              options: ['Vapor que se enfría', 'Agua que hierve'],
              correctOptionIndex: 0,
            },
          ],
        }),
      );
      expect(config.triggers).toMatchObject([{ kind: 'QUESTION', correctOptionIndex: 0 }]);
    });
  });

  describe('validateContent', () => {
    it('exige el config ya validado', () => {
      expect(() => validator.validateContent([gem()])).toThrow(InvalidGameContentError);
    });

    it('rechaza menos del mínimo de gemas por rol', () => {
      const config = validator.validateConfig(validConfig());
      const content = [gem(), gem({ gemId: 'gem-2', role: 'WATER', position: { row: 0, col: 6 }, order: 2 })];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('rechaza una gema en una casilla no pasable para su rol', () => {
      const config = validator.validateConfig(validConfig());
      const content = [gem({ position: { row: 3, col: 5 } })];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('rechaza un "order" con huecos', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        gem({ gemId: 'f1', role: 'FIRE', position: { row: 0, col: 1 }, order: 1 }),
        gem({ gemId: 'f2', role: 'FIRE', position: { row: 1, col: 1 }, order: 5 }),
        gem({ gemId: 'w1', role: 'WATER', position: { row: 0, col: 6 }, order: 2 }),
        gem({ gemId: 'w2', role: 'WATER', position: { row: 1, col: 6 }, order: 3 }),
      ];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('rechaza un gemId repetido', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        gem({ gemId: 'f1', role: 'FIRE', position: { row: 0, col: 1 }, order: 1 }),
        gem({ gemId: 'f1', role: 'FIRE', position: { row: 1, col: 1 }, order: 2 }),
        gem({ gemId: 'w1', role: 'WATER', position: { row: 0, col: 6 }, order: 3 }),
        gem({ gemId: 'w2', role: 'WATER', position: { row: 1, col: 6 }, order: 4 }),
      ];
      expect(() => validator.validateContent(content, config)).toThrow(InvalidGameContentError);
    });

    it('acepta un caso completo válido', () => {
      const config = validator.validateConfig(validConfig());
      const content = [
        gem({ gemId: 'f1', role: 'FIRE', position: { row: 0, col: 1 }, order: 1 }),
        gem({ gemId: 'w1', role: 'WATER', position: { row: 0, col: 6 }, order: 2 }),
        gem({ gemId: 'f2', role: 'FIRE', position: { row: 1, col: 1 }, order: 3 }),
        gem({ gemId: 'w2', role: 'WATER', position: { row: 1, col: 6 }, order: 4 }),
      ];
      const result = validator.validateContent(content, config) as Array<Record<string, unknown>>;
      expect(result).toHaveLength(4);
    });
  });
});
