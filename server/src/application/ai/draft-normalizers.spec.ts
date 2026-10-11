import { describe, expect, it } from 'vitest';
import { normalizeDraft, truncate } from './draft-normalizers.js';

describe('truncate', () => {
  it('no toca un texto que ya cabe', () => {
    expect(truncate('hola', 10)).toBe('hola');
    expect(truncate('1234567890', 10)).toBe('1234567890');
  });

  it('corta en una palabra completa y agrega puntos suspensivos sin pasarse del máximo', () => {
    const result = truncate('uno dos tres cuatro cinco seis siete', 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith('…')).toBe(true);
    expect(result).toBe('uno dos tres cuatro…');
  });

  it('si no hay un espacio razonable, corta duro', () => {
    expect(truncate('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe('normalizeDraft — Laberinto Verdadero o Falso', () => {
  const norm = (config: unknown, content: unknown, dedupe?: boolean) =>
    normalizeDraft({ gameType: 'TRUE_FALSE_MAZE', dedupe }, config, content);

  it('acota los números de la config a su rango y fuerza la única skin', () => {
    const { config } = norm({ lives: 99, enemyCount: -3, enemySpeed: 2.6, skin: 'otra' }, []);
    expect(config).toEqual({ skin: 'NAVE_ESPACIAL', lives: 5, enemyCount: 1, enemySpeed: 3 });
  });

  it('lee números escritos como texto y descarta lo que no es un número (para que valga el valor por defecto)', () => {
    const { config } = norm({ lives: '4', enemyCount: 'muchas' }, []);
    expect(config).toEqual({ skin: 'NAVE_ESPACIAL', lives: 4 });
  });

  it.each([
    [0, 0],
    [5, 0],
    [8, 12],
    [14, 12],
    [17, 20],
    [25, 20],
    [26, 30],
    [100, 30],
  ])('relocateSeconds %s se ajusta a la opción más cercana del formulario (%s)', (input, expected) => {
    expect(norm({ relocateSeconds: input }, []).config.relocateSeconds).toBe(expected);
  });

  it('convierte booleanos escritos como texto y descarta los ininteligibles', () => {
    const { config } = norm({ shuffleQuestions: 'Sí', lightsOut: 'falso' }, []);
    expect(config).toMatchObject({ shuffleQuestions: true, lightsOut: false });
    expect(norm({ lightsOut: 'quizá' }, []).config).not.toHaveProperty('lightsOut');
  });

  it.each([
    [true, true],
    [false, false],
    ['Verdadero', true],
    ['VERDADERA', true],
    ['falso', false],
    ['Falsa', false],
    ['true', true],
    ['false', false],
    ['sí', true],
    ['no', false],
    [1, true],
    [0, false],
  ])('la respuesta %j se interpreta como %s', (input, expected) => {
    const { content } = norm({}, [{ statement: 'Una afirmación válida.', answer: input }]);
    expect((content as Array<{ answer: unknown }>)[0].answer).toBe(expected);
  });

  it('deja intacta una respuesta que no se puede interpretar, para que el validador la rechace', () => {
    const { content } = norm({}, [{ statement: 'Una afirmación válida.', answer: 'tal vez' }]);
    expect((content as Array<{ answer: unknown }>)[0].answer).toBe('tal vez');
  });

  it('quita afirmaciones repetidas (sin importar mayúsculas ni espacios) y vacías', () => {
    const { content } = norm({}, [
      { statement: 'La Tierra gira.', answer: true },
      { statement: '  la tierra GIRA.  ', answer: true },
      { statement: '   ', answer: true },
      { statement: 'El Sol es una estrella.', answer: true },
    ]);
    expect((content as Array<{ statement: string }>).map((q) => q.statement)).toEqual([
      'La Tierra gira.',
      'El Sol es una estrella.',
    ]);
  });

  it('respeta dedupe: false (no descarta nada)', () => {
    const { content } = norm(
      {},
      [
        { statement: 'La Tierra gira.', answer: true },
        { statement: 'La Tierra gira.', answer: true },
      ],
      false,
    );
    expect(content).toHaveLength(2);
  });

  it('recorta la explicación al máximo y se queda con 30 afirmaciones como mucho', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ statement: `Afirmación ${i}`, answer: true, explanation: 'palabra '.repeat(60) }));
    const { content } = norm({}, many);
    const questions = content as Array<{ explanation: string }>;
    expect(questions).toHaveLength(30);
    expect(questions.every((q) => q.explanation.length <= 240)).toBe(true);
  });

  it('descarta elementos que no son objetos', () => {
    const { content } = norm({}, ['texto', null, 7, [1], { statement: 'Válida de verdad.', answer: false }]);
    expect(content).toHaveLength(1);
  });

  it('si el contenido no es una lista, lo devuelve igual para que el validador lo rechace', () => {
    expect(norm({}, 'nada').content).toBe('nada');
    expect(norm({}, undefined).content).toBeUndefined();
    expect(norm({}, { a: 1 }).content).toEqual({ a: 1 });
  });

  it('una config que no es un objeto se trata como vacía', () => {
    expect(norm('mal', []).config).toEqual({ skin: 'NAVE_ESPACIAL' });
    expect(norm(null, []).config).toEqual({ skin: 'NAVE_ESPACIAL' });
    expect(norm([1, 2], []).config).toEqual({ skin: 'NAVE_ESPACIAL' });
  });
});

describe('normalizeDraft — contenido envuelto', () => {
  it('desenvuelve una lista única dentro de un objeto', () => {
    const { content } = normalizeDraft({ gameType: 'DOMINO' }, {}, { conceptos: [{ label: 'A', icon: 'star', color: '#22c55e' }] });
    expect(content).toHaveLength(1);
  });

  it('no adivina si el objeto tiene varias listas', () => {
    const { content } = normalizeDraft({ gameType: 'DOMINO' }, {}, { a: [1], b: [2] });
    expect(content).toEqual({ a: [1], b: [2] });
  });
});

describe('normalizeDraft — Memoria', () => {
  it('PAIRS: fuerza el modo y acota los parámetros', () => {
    const { config } = normalizeDraft(
      { gameType: 'MEMORY_MATCH', mode: 'PAIRS' },
      { mode: 'OPPOSITES', perZone: 1, timePerZoneSeconds: 5000, previewSeconds: -2 },
      [],
    );
    expect(config).toEqual({ mode: 'PAIRS', perZone: 2, timePerZoneSeconds: 600, previewSeconds: 0 });
  });

  it('PAIRS: conserva imageQuery/emoji/color y las imágenes del usuario (sin dedupe por defecto)', () => {
    const { content } = normalizeDraft({ gameType: 'MEMORY_MATCH', mode: 'PAIRS' }, {}, [
      { label: 'Cubo', imageIndex: 0, imageQuery: 'Cube', emoji: '🧊', color: '#fff' },
      { label: 'Cubo', imageIndex: 1 },
    ]);
    expect(content).toEqual([
      { label: 'Cubo', imageIndex: 0, imageQuery: 'Cube', emoji: '🧊', color: '#fff' },
      { label: 'Cubo', imageIndex: 1 },
    ]);
  });

  it('PAIRS: con dedupe quita conceptos repetidos y recorta etiquetas de más de 120 caracteres', () => {
    const { content } = normalizeDraft({ gameType: 'MEMORY_MATCH', mode: 'PAIRS', dedupe: true }, {}, [
      { label: 'Cubo' },
      { label: 'cubo ' },
      { label: 'palabra '.repeat(30) },
    ]);
    const pairs = content as Array<{ label: string }>;
    expect(pairs).toHaveLength(2);
    expect(pairs[1].label.length).toBeLessThanOrEqual(120);
  });

  it('OPPOSITES: fuerza el modo, deja null las imágenes ausentes y recorta textos largos', () => {
    const { config, content } = normalizeDraft({ gameType: 'MEMORY_MATCH', mode: 'OPPOSITES' }, { perZone: 8 }, [
      { posTitle: 'Ácido', posDescription: 'x'.repeat(600), negTitle: 'Base', negDescription: 'pH alto' },
    ]);
    expect(config).toMatchObject({ mode: 'OPPOSITES', perZone: 8 });
    const pair = (content as Array<Record<string, unknown>>)[0];
    expect(pair.posImageUrl).toBeNull();
    expect(pair.negImageUrl).toBeNull();
    expect((pair.posDescription as string).length).toBeLessThanOrEqual(500);
  });
});

describe('normalizeDraft — ¿Quién Es?', () => {
  it('acota la config y recorta el dato curioso', () => {
    const { config, content } = normalizeDraft(
      { gameType: 'GUESS_WHO' },
      { maxAccusationCount: 50, turnDurationSeconds: 1 },
      [{ label: 'Argentina', info: 'dato '.repeat(200) }],
    );
    expect(config).toEqual({ maxAccusationCount: 12, turnDurationSeconds: 5 });
    expect(((content as Array<{ info: string }>)[0].info).length).toBeLessThanOrEqual(500);
  });

  it('con dedupe quita tarjetas con el mismo nombre; sin dedupe (imágenes del usuario) conserva todas', () => {
    const cards = [{ label: 'Perú' }, { label: 'perú' }, { label: 'Chile' }];
    expect(normalizeDraft({ gameType: 'GUESS_WHO', dedupe: true }, {}, cards).content).toHaveLength(2);
    expect(normalizeDraft({ gameType: 'GUESS_WHO' }, {}, cards).content).toHaveLength(3);
  });

  it('se queda con 60 tarjetas como mucho', () => {
    const cards = Array.from({ length: 70 }, (_, i) => ({ label: `País ${i}` }));
    expect(normalizeDraft({ gameType: 'GUESS_WHO' }, {}, cards).content).toHaveLength(60);
  });
});

describe('normalizeDraft — Dominó y Laberinto recolector', () => {
  it('DOMINO: ícono "star" por defecto, color válido y etiquetas acotadas a 60', () => {
    const { content } = normalizeDraft({ gameType: 'DOMINO' }, { handSize: 2 }, [
      { label: 'x'.repeat(100), color: 'azul' },
      { label: 'Solar', icon: ' ', color: '#16a34a' },
    ]);
    const concepts = content as Array<{ label: string; icon: string; color: string }>;
    expect(concepts[0].label.length).toBeLessThanOrEqual(60);
    expect(concepts[0].icon).toBe('star');
    expect(concepts[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(concepts[1]).toMatchObject({ icon: 'star', color: '#16a34a' });
  });

  it('DOMINO: acota handSize', () => {
    expect(normalizeDraft({ gameType: 'DOMINO' }, { handSize: 2 }, []).config).toEqual({ handSize: 3 });
    expect(normalizeDraft({ gameType: 'DOMINO' }, { handSize: 40 }, []).config).toEqual({ handSize: 12 });
  });

  it('MAZE_COLLECTOR: arregla layout, vidas, íconos, etiquetas y el dato opcional', () => {
    const { config, content } = normalizeDraft(
      { gameType: 'MAZE_COLLECTOR' },
      { layout: 'espiral', lives: 0, enemySpeed: 9, collectorLabel: 'c'.repeat(80), enemyLabel: 'Nube' },
      [
        { label: 'Vidrio', color: '#3b82f6', fact: 'dato '.repeat(100) },
        { label: 'Papel', icon: 'leaf', color: 'x', fact: '   ' },
      ],
    );
    expect(config).toMatchObject({ layout: 'CLASSIC', lives: 1, enemySpeed: 3, collectorIcon: 'star', enemyIcon: 'star' });
    expect((config.collectorLabel as string).length).toBeLessThanOrEqual(60);
    const items = content as Array<Record<string, unknown>>;
    expect((items[0].fact as string).length).toBeLessThanOrEqual(200);
    expect(items[1]).not.toHaveProperty('fact');
    expect(items[1].icon).toBe('leaf');
  });

  it('MAZE_COLLECTOR: respeta un layout válido en minúsculas', () => {
    expect(normalizeDraft({ gameType: 'MAZE_COLLECTOR' }, { layout: 'spiral' }, []).config.layout).toBe('SPIRAL');
  });
});

describe('normalizeDraft — tipos sin arreglo seguro', () => {
  it.each(['SNAKES_LADDERS', 'DUAL_QUEST', 'DUAL_QUEST_PIXI'] as const)('%s pasa tal cual (solo asegura que config sea objeto)', (gameType) => {
    const content = [{ cellNumber: 4 }];
    expect(normalizeDraft({ gameType }, null, content)).toEqual({ config: {}, content });
  });
});
