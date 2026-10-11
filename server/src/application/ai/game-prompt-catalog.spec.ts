import { describe, expect, it } from 'vitest';
import { VALID_GAME_TYPES, type GameTypeName } from '../../domain/value-objects/game-type.vo.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { MemoryMatchContentValidator } from '../content-validators/memory-match.content-validator.js';
import { GuessWhoContentValidator } from '../content-validators/guess-who.content-validator.js';
import { DominoContentValidator } from '../content-validators/domino.content-validator.js';
import { MazeCollectorContentValidator } from '../content-validators/maze-collector.content-validator.js';
import { SnakesLaddersContentValidator } from '../content-validators/snakes-ladders.content-validator.js';
import { DualQuestContentValidator } from '../content-validators/dual-quest.content-validator.js';
import { DualQuestPixiContentValidator } from '../content-validators/dual-quest-pixi.content-validator.js';
import { TrueFalseMazeContentValidator } from '../content-validators/true-false-maze.content-validator.js';
import { normalizeDraft } from './draft-normalizers.js';
import { resolveGamePromptSpec } from './game-prompt-catalog.js';

const registry = new ContentValidatorRegistry(
  new MemoryMatchContentValidator(),
  new GuessWhoContentValidator(),
  new DominoContentValidator(),
  new MazeCollectorContentValidator(),
  new SnakesLaddersContentValidator(),
  new DualQuestContentValidator(),
  new DualQuestPixiContentValidator(),
  new TrueFalseMazeContentValidator(),
);

const CASES: Array<{ name: string; gameType: GameTypeName; mode?: string }> = [
  { name: 'DOMINO', gameType: 'DOMINO' },
  { name: 'MAZE_COLLECTOR', gameType: 'MAZE_COLLECTOR' },
  { name: 'SNAKES_LADDERS', gameType: 'SNAKES_LADDERS' },
  { name: 'GUESS_WHO', gameType: 'GUESS_WHO' },
  { name: 'MEMORY_MATCH / PAIRS', gameType: 'MEMORY_MATCH', mode: 'PAIRS' },
  { name: 'MEMORY_MATCH / OPPOSITES', gameType: 'MEMORY_MATCH', mode: 'OPPOSITES' },
  { name: 'DUAL_QUEST', gameType: 'DUAL_QUEST' },
  { name: 'TRUE_FALSE_MAZE', gameType: 'TRUE_FALSE_MAZE' },
];

/** Cuántos elementos tiene que tener el ejemplo (abreviado a propósito en el prompt) para pasar los mínimos de cantidad. */
const PAD_TO: Partial<Record<GameTypeName, number>> = {
  DOMINO: 8,
  MAZE_COLLECTOR: 6,
  TRUE_FALSE_MAZE: 8,
  MEMORY_MATCH: 4,
  GUESS_WHO: 12,
  SNAKES_LADDERS: 12,
};
const UNIQUE_TEXT_FIELDS = ['label', 'statement', 'posTitle', 'negTitle'];

/** Repite el último elemento del ejemplo (con textos y casillas únicos) hasta llegar a `target`. */
function padExample(gameType: GameTypeName, content: unknown): unknown {
  const target = PAD_TO[gameType];
  if (!target || !Array.isArray(content) || content.length === 0) return content;
  const padded = [...content];
  const template = content[content.length - 1] as Record<string, unknown>;
  for (let n = 1; padded.length < target; n += 1) {
    const clone: Record<string, unknown> = { ...template };
    for (const field of UNIQUE_TEXT_FIELDS) {
      if (typeof clone[field] === 'string') clone[field] = `${clone[field]} ${n}`;
    }
    if (gameType === 'SNAKES_LADDERS') {
      clone.cellNumber = 10 + n;
      clone.triggerType = 'CELL';
      clone.prompt = `${String(template.prompt)} ${n}`;
    }
    padded.push(clone);
  }
  return padded;
}

/** Pasa el ejemplo de JSON del prompt por la misma tubería que el borrador real: normalizar y validar. */
function runThroughPipeline(gameType: GameTypeName, mode: string | undefined, example: string, imagesState: 'user' | 'none') {
  const parsed = JSON.parse(example) as { config: unknown; content: unknown };
  let content = padExample(gameType, parsed.content);
  if (imagesState !== null && Array.isArray(content) && (gameType === 'GUESS_WHO' || (gameType === 'MEMORY_MATCH' && mode === 'PAIRS'))) {
    // Con imágenes del usuario el caso de uso reemplaza cada imageIndex por la URL ya subida;
    // sin ellas, deja imageUrl en null hasta que `ContentImageResolver` consigue una.
    content = content.map((item: Record<string, unknown>) => {
      const { imageIndex: _discarded, ...rest } = item;
      return { ...rest, imageUrl: imagesState === 'user' ? 'https://cdn.test/imagen.png' : null };
    });
  }
  const normalized = normalizeDraft({ gameType, mode, dedupe: true }, parsed.config, content);
  const validator = registry.resolve(gameType);
  const config = validator.validateConfig(normalized.config);
  return { config, content: validator.validateContent(normalized.content, config, { isDraft: true }) };
}

describe('catálogo de prompts de la IA', () => {
  it('todos los tipos de juego tienen asistente, salvo Dúo Lógico Pixi (que no usa IA todavía)', () => {
    for (const gameType of VALID_GAME_TYPES) {
      if (gameType === 'DUAL_QUEST_PIXI') {
        expect(resolveGamePromptSpec(gameType)).toBeNull();
      } else if (gameType === 'MEMORY_MATCH') {
        expect(resolveGamePromptSpec(gameType, 'PAIRS')).not.toBeNull();
        expect(resolveGamePromptSpec(gameType, 'OPPOSITES')).not.toBeNull();
        expect(resolveGamePromptSpec(gameType)).toBeNull();
      } else {
        expect(resolveGamePromptSpec(gameType), gameType).not.toBeNull();
      }
    }
  });

  describe.each(CASES)('$name', ({ gameType, mode }) => {
    const spec = resolveGamePromptSpec(gameType, mode)!;

    it('su ejemplo de JSON es válido: pasa el mismo validador que la creación manual', () => {
      expect(() => runThroughPipeline(gameType, mode, spec.jsonShapeExample, 'user')).not.toThrow();
    });

    it('si tiene versión sin imágenes, ese ejemplo también es válido', () => {
      if (!spec.imageRequirement) return;
      expect(spec.textOnlyInstructions).toBeTruthy();
      expect(spec.textOnlyJsonShapeExample).toBeTruthy();
      expect(() => runThroughPipeline(gameType, mode, spec.textOnlyJsonShapeExample!, 'none')).not.toThrow();
    });

    it('las instrucciones están escritas en español y no están vacías', () => {
      expect(spec.instructions.length).toBeGreaterThan(200);
      expect(spec.instructions).toMatch(/Genera/);
    });
  });

  describe('versión sin imágenes de ¿Quién Es? y Parejas', () => {
    it.each([
      ['GUESS_WHO', undefined],
      ['MEMORY_MATCH', 'PAIRS'],
    ] as const)('%s pide a la IA el imageQuery, el emoji y el color de cada elemento (sin imageIndex ni imageUrl)', (gameType, mode) => {
      const spec = resolveGamePromptSpec(gameType, mode)!;
      const text = spec.textOnlyInstructions!;
      expect(text).toContain('"imageQuery"');
      expect(text).toContain('"emoji"');
      expect(text).toContain('"color"');
      expect(text).toContain('NO incluyas "imageIndex" ni "imageUrl"');

      const example = JSON.parse(spec.textOnlyJsonShapeExample!) as { content: Array<Record<string, unknown>> };
      for (const item of example.content) {
        expect(item).toHaveProperty('imageQuery');
        expect(item).toHaveProperty('emoji');
        expect(item).toHaveProperty('color');
        expect(item).not.toHaveProperty('imageIndex');
        expect(item).not.toHaveProperty('imageUrl');
      }
    });

    it('la versión con imágenes del usuario NO pide emoji ni color (las imágenes ya existen)', () => {
      expect(resolveGamePromptSpec('GUESS_WHO')!.instructions).not.toContain('"emoji"');
      expect(resolveGamePromptSpec('MEMORY_MATCH', 'PAIRS')!.instructions).not.toContain('"emoji"');
    });
  });

  describe('Laberinto Verdadero o Falso', () => {
    const spec = resolveGamePromptSpec('TRUE_FALSE_MAZE')!;

    it('explica cada parámetro de la partida que el validador acepta, para que la IA pueda parametrizarlos', () => {
      for (const key of ['lives', 'enemyCount', 'enemySpeed', 'relocateSeconds', 'shuffleQuestions', 'lightsOut', 'skin']) {
        expect(spec.instructions, key).toContain(`"${key}"`);
      }
    });

    it('da una guía de dificultad (fácil / medio / difícil)', () => {
      expect(spec.instructions).toMatch(/FÁCIL/);
      expect(spec.instructions).toMatch(/MEDIO/);
      expect(spec.instructions).toMatch(/DIFÍCIL/);
    });

    it('limita relocateSeconds a los valores que ofrece el formulario del cliente (0, 12, 20, 30)', () => {
      for (const value of ['0', '12', '20', '30']) {
        expect(spec.instructions).toContain(value);
      }
    });

    it('permite generar a partir de texto, de imágenes o solo del tema', () => {
      expect(spec.instructions).toMatch(/texto|imágenes|tema/);
      expect(spec.imageRequirement).toBeNull();
    });
  });
});
