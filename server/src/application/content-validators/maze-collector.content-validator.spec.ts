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
  });
});
