import { describe, expect, it } from 'vitest';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { MazeCollectorContentValidator } from './maze-collector.content-validator.js';

function validItem(overrides: Record<string, unknown> = {}) {
  return {
    itemId: 'vidrio',
    label: 'Vidrio',
    icon: 'wine',
    color: '#22c55e',
    ...overrides,
  };
}

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    layout: 'CLASSIC',
    lives: 3,
    enemySpeed: 2,
    collectorLabel: 'Camión de reciclaje',
    collectorIcon: 'truck',
    enemyLabel: 'Nube de contaminación',
    enemyIcon: 'cloud',
    ...overrides,
  };
}

function fourItems() {
  return [
    validItem({ itemId: 'a', label: 'A' }),
    validItem({ itemId: 'b', label: 'B' }),
    validItem({ itemId: 'c', label: 'C' }),
    validItem({ itemId: 'd', label: 'D' }),
  ];
}

describe('MazeCollectorContentValidator', () => {
  const validator = new MazeCollectorContentValidator();

  describe('validateConfig', () => {
    it('aplica los valores por defecto cuando no vienen', () => {
      const config = validator.validateConfig({
        collectorLabel: 'Camión de reciclaje',
        collectorIcon: 'truck',
        enemyLabel: 'Nube de contaminación',
        enemyIcon: 'cloud',
      });

      expect(config).toEqual({
        layout: 'CLASSIC',
        lives: 3,
        enemySpeed: 2,
        collectorLabel: 'Camión de reciclaje',
        collectorIcon: 'truck',
        enemyLabel: 'Nube de contaminación',
        enemyIcon: 'cloud',
      });
    });

    it('acepta un config completo válido', () => {
      const config = validator.validateConfig(validConfig({ layout: 'SPIRAL', lives: 5, enemySpeed: 3 }));
      expect(config).toEqual(validConfig({ layout: 'SPIRAL', lives: 5, enemySpeed: 3 }));
    });

    it('rechaza un layout desconocido', () => {
      expect(() => validator.validateConfig(validConfig({ layout: 'HEXAGON' }))).toThrow(InvalidGameContentError);
    });

    it('acepta el layout CITY', () => {
      const config = validator.validateConfig(validConfig({ layout: 'CITY' }));
      expect(config).toMatchObject({ layout: 'CITY' });
    });

    it('rechaza lives fuera de rango', () => {
      expect(() => validator.validateConfig(validConfig({ lives: 0 }))).toThrow(InvalidGameContentError);
      expect(() => validator.validateConfig(validConfig({ lives: 6 }))).toThrow(InvalidGameContentError);
    });

    it('rechaza enemySpeed fuera de rango', () => {
      expect(() => validator.validateConfig(validConfig({ enemySpeed: 0 }))).toThrow(InvalidGameContentError);
      expect(() => validator.validateConfig(validConfig({ enemySpeed: 4 }))).toThrow(InvalidGameContentError);
    });

    it('exige las etiquetas e íconos temáticos', () => {
      expect(() => validator.validateConfig(validConfig({ collectorLabel: undefined }))).toThrow(
        InvalidGameContentError,
      );
      expect(() => validator.validateConfig(validConfig({ enemyIcon: '' }))).toThrow(InvalidGameContentError);
    });

    it('acepta schoolQuestion y recyclingQuestion opcionales válidas', () => {
      const config = validator.validateConfig(
        validConfig({
          layout: 'CITY',
          schoolQuestion: { prompt: '¿Qué es reciclar?', options: ['A', 'B'], correctOptionIndex: 0 },
          recyclingQuestion: { prompt: '¿Dónde va el vidrio?', options: ['Verde', 'Gris'], correctOptionIndex: 0 },
        }),
      );
      expect(config).toMatchObject({
        schoolQuestion: { prompt: '¿Qué es reciclar?', options: ['A', 'B'], correctOptionIndex: 0 },
        recyclingQuestion: { prompt: '¿Dónde va el vidrio?', options: ['Verde', 'Gris'], correctOptionIndex: 0 },
      });
    });

    it('rechaza una schoolQuestion inválida', () => {
      expect(() =>
        validator.validateConfig(validConfig({ schoolQuestion: { prompt: '', options: ['A', 'B'], correctOptionIndex: 0 } })),
      ).toThrow(InvalidGameContentError);
    });

    it('no exige schoolQuestion/recyclingQuestion — config sin ellas sigue siendo válido (retrocompatibilidad)', () => {
      const config = validator.validateConfig(validConfig());
      expect(config).not.toHaveProperty('schoolQuestion');
      expect(config).not.toHaveProperty('recyclingQuestion');
    });
  });

  describe('validateContent', () => {
    it('rechaza menos de 4 objetos', () => {
      expect(() => validator.validateContent(fourItems().slice(0, 3))).toThrow(InvalidGameContentError);
    });

    it('rechaza más de 16 objetos', () => {
      const items = Array.from({ length: 17 }, (_, i) => validItem({ itemId: `item-${i}`, label: `Item ${i}` }));
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('rechaza un itemId duplicado', () => {
      const items = fourItems();
      items[1] = { ...items[1], itemId: items[0].itemId };
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('rechaza un color inválido', () => {
      const items = fourItems();
      items[0] = validItem({ itemId: 'a', label: 'A', color: 'no-es-un-color' });
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('acepta un caso válido mínimo con fact opcional', () => {
      const items = fourItems();
      items[0] = validItem({ itemId: 'a', label: 'A', fact: 'El vidrio es 100% reciclable.' });

      const result = validator.validateContent(items) as Array<Record<string, unknown>>;
      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ itemId: 'a', fact: 'El vidrio es 100% reciclable.' });
      expect(result[1]).not.toHaveProperty('fact');
    });

    it('acepta un ítem con question opcional válida', () => {
      const items = fourItems();
      items[0] = validItem({
        itemId: 'a',
        label: 'A',
        question: {
          prompt: '¿En qué caneca va el vidrio?',
          options: ['Verde', 'Azul', 'Gris'],
          correctOptionIndex: 0,
        },
      });

      const result = validator.validateContent(items) as Array<Record<string, unknown>>;
      expect(result[0]).toMatchObject({
        itemId: 'a',
        question: {
          prompt: '¿En qué caneca va el vidrio?',
          options: ['Verde', 'Azul', 'Gris'],
          correctOptionIndex: 0,
        },
      });
      expect(result[1]).not.toHaveProperty('question');
    });

    it('rechaza una question con menos de 2 opciones', () => {
      const items = fourItems();
      items[0] = validItem({
        itemId: 'a',
        label: 'A',
        question: { prompt: '¿Pregunta?', options: ['Única'], correctOptionIndex: 0 },
      });
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('rechaza una question con correctOptionIndex fuera de rango', () => {
      const items = fourItems();
      items[0] = validItem({
        itemId: 'a',
        label: 'A',
        question: { prompt: '¿Pregunta?', options: ['A', 'B'], correctOptionIndex: 5 },
      });
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('rechaza una question sin prompt', () => {
      const items = fourItems();
      items[0] = validItem({
        itemId: 'a',
        label: 'A',
        question: { prompt: '', options: ['A', 'B'], correctOptionIndex: 0 },
      });
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('rechaza un difficulty inválido en la question', () => {
      const items = fourItems();
      items[0] = validItem({
        itemId: 'a',
        label: 'A',
        question: { prompt: '¿Pregunta?', options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'EXTREME' },
      });
      expect(() => validator.validateContent(items)).toThrow(InvalidGameContentError);
    });

    it('acepta un wasteType válido y lo rechaza si es desconocido', () => {
      const items = fourItems();
      items[0] = validItem({ itemId: 'a', label: 'A', wasteType: 'GLASS' });
      const result = validator.validateContent(items) as Array<Record<string, unknown>>;
      expect(result[0]).toMatchObject({ wasteType: 'GLASS' });

      const invalidItems = fourItems();
      invalidItems[0] = validItem({ itemId: 'a', label: 'A', wasteType: 'METAL' });
      expect(() => validator.validateContent(invalidItems)).toThrow(InvalidGameContentError);
    });

    it('acepta isPowerUp true y lo omite si no viene', () => {
      const items = fourItems();
      items[0] = validItem({ itemId: 'a', label: 'A', isPowerUp: true });
      const result = validator.validateContent(items) as Array<Record<string, unknown>>;
      expect(result[0]).toMatchObject({ isPowerUp: true });
      expect(result[1]).not.toHaveProperty('isPowerUp');
    });

    it('un ítem sin wasteType ni isPowerUp sigue siendo válido (retrocompatibilidad)', () => {
      const items = fourItems();
      const result = validator.validateContent(items) as Array<Record<string, unknown>>;
      expect(result[0]).not.toHaveProperty('wasteType');
      expect(result[0]).not.toHaveProperty('isPowerUp');
    });
  });
});
