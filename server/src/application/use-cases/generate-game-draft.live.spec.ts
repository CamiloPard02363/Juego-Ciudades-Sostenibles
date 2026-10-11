import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ImageStorage, UploadedImage } from '../../domain/ports/image-storage.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { MemoryMatchContentValidator } from '../content-validators/memory-match.content-validator.js';
import { GuessWhoContentValidator } from '../content-validators/guess-who.content-validator.js';
import { DominoContentValidator } from '../content-validators/domino.content-validator.js';
import { MazeCollectorContentValidator } from '../content-validators/maze-collector.content-validator.js';
import { SnakesLaddersContentValidator } from '../content-validators/snakes-ladders.content-validator.js';
import { DualQuestContentValidator } from '../content-validators/dual-quest.content-validator.js';
import { DualQuestPixiContentValidator } from '../content-validators/dual-quest-pixi.content-validator.js';
import { TrueFalseMazeContentValidator } from '../content-validators/true-false-maze.content-validator.js';
import { ContentImageResolver } from '../services/content-image-resolver.service.js';
import { FileTextExtractor } from '../../infrastructure/ai/file-text-extractor.js';
import { GroqContentAssistant } from '../../infrastructure/ai/groq-content-assistant.adapter.js';
import { WikimediaContentImageFinder } from '../../infrastructure/ai/wikimedia-content-image-finder.js';
import { GenerateGameDraftUseCase } from './generate-game-draft.use-case.js';

/**
 * Pruebas EN VIVO contra Groq (y Wikimedia). No corren con `npm test`: son
 * lentas, gastan cuota y necesitan GROQ_API_KEY. Para correrlas:
 *
 *   cd server
 *   LIVE_AI=1 node --env-file=.env ./node_modules/vitest/vitest.mjs run src/application/use-cases/generate-game-draft.live.spec.ts
 *
 * Opcionales: LIVE_AI_IMAGE=<ruta a un PNG/JPG con texto> para probar la
 * lectura de imágenes (visión), y LIVE_AI_OUT=<carpeta> para guardar las
 * ilustraciones SVG generadas y poder abrirlas en el navegador.
 *
 * El almacenamiento de imágenes es SIEMPRE simulado en memoria: estas
 * pruebas nunca suben nada a Cloudinary.
 */
const live = Boolean(process.env.LIVE_AI && process.env.GROQ_API_KEY);

function buildRegistry(): ContentValidatorRegistry {
  return new ContentValidatorRegistry(
    new MemoryMatchContentValidator(),
    new GuessWhoContentValidator(),
    new DominoContentValidator(),
    new MazeCollectorContentValidator(),
    new SnakesLaddersContentValidator(),
    new DualQuestContentValidator(),
    new DualQuestPixiContentValidator(),
    new TrueFalseMazeContentValidator(),
  );
}

describe.skipIf(!live)('GenerateGameDraftUseCase — EN VIVO con Groq', () => {
  const uploads: Array<{ buffer: Buffer; folder: string }> = [];
  const storage: ImageStorage = {
    upload: vi.fn(async (buffer: Buffer, folder: string): Promise<UploadedImage> => {
      uploads.push({ buffer, folder });
      return { url: `https://cdn.test/live-${uploads.length}`, publicId: `live-${uploads.length}` };
    }),
    uploadAudio: vi.fn(),
  };

  let assistant: GroqContentAssistant;
  let useCase: GenerateGameDraftUseCase;

  beforeAll(() => {
    assistant = new GroqContentAssistant();
    useCase = new GenerateGameDraftUseCase(
      assistant,
      storage,
      new FileTextExtractor(assistant),
      buildRegistry(),
      new ContentImageResolver(new WikimediaContentImageFinder(), storage),
    );
  });

  afterAll(() => {
    const out = process.env.LIVE_AI_OUT;
    if (!out) return;
    mkdirSync(out, { recursive: true });
    uploads
      .filter(({ buffer }) => buffer.toString('utf-8', 0, 4) === '<svg')
      .forEach(({ buffer }, index) => writeFileSync(join(out, `ilustracion-${index + 1}.svg`), buffer));
  });

  it('Laberinto V/F, solo con el tema y dificultad FÁCIL: parametriza la partida a favor del jugador', async () => {
    const result = await useCase.execute({
      gameType: 'TRUE_FALSE_MAZE',
      message: 'La fotosíntesis, nivel fácil para niños de primaria. 8 afirmaciones.',
      files: [],
    });

    console.log('TF fácil → config', JSON.stringify(result.config), '| afirmaciones', result.content.length);
    console.log('  ejemplo:', JSON.stringify(result.content[0]));
    expect(result.content.length).toBeGreaterThanOrEqual(3);
    const config = result.config as { lives: number; enemyCount: number };
    expect(config.lives).toBeGreaterThanOrEqual(3);
    expect(config.enemyCount).toBeLessThanOrEqual(3);
  }, 300_000);

  it('Laberinto V/F, dificultad DIFÍCIL: la partida es más exigente', async () => {
    const result = await useCase.execute({
      gameType: 'TRUE_FALSE_MAZE',
      message: 'Segunda Guerra Mundial, nivel difícil para universitarios. 10 afirmaciones.',
      files: [],
    });

    console.log('TF difícil → config', JSON.stringify(result.config), '| afirmaciones', result.content.length);
    const config = result.config as { lives: number; enemySpeed: number };
    expect(config.lives).toBeLessThanOrEqual(3);
    expect(config.enemySpeed).toBeGreaterThanOrEqual(2);
  }, 300_000);

  it('¿Quién Es? solo con el tema: tarjetas completas, cada una con imagen (foto de Wikimedia o ilustración de la IA)', async () => {
    const result = await useCase.execute({
      gameType: 'GUESS_WHO',
      message: 'Animales de la selva amazónica.',
      files: [],
    });

    const cards = result.content as Array<{ label: string; imageUrl: string | null; info: string | null }>;
    console.log('Quién Es →', cards.length, 'tarjetas |', cards.slice(0, 5).map((card) => card.label).join(', '));
    console.log('  aviso:', result.notice);
    expect(cards.length).toBeGreaterThanOrEqual(12);
    expect(cards.every((card) => card.imageUrl)).toBe(true);
    expect(new Set(cards.map((card) => card.label.toLowerCase())).size).toBe(cards.length);
  }, 300_000);

  it('Parejas (MatchMente) solo con el tema y SOLO ilustraciones de la IA: cada pareja con su ilustración', async () => {
    vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', 'ai');
    try {
      const result = await useCase.execute({
        gameType: 'MEMORY_MATCH',
        mode: 'PAIRS',
        message: 'Figuras y sólidos geométricos básicos.',
        files: [],
      });

      const pairs = result.content as Array<{ label: string; imageUrl: string | null }>;
      console.log('Parejas →', pairs.map((pair) => pair.label).join(', '));
      console.log('  aviso:', result.notice);
      expect(pairs.length).toBeGreaterThanOrEqual(4);
      expect(pairs.every((pair) => pair.imageUrl)).toBe(true);
      expect(uploads.some(({ buffer }) => buffer.toString().startsWith('<svg'))).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  }, 300_000);

  it.skipIf(!process.env.LIVE_AI_IMAGE)('Laberinto V/F a partir de una IMAGEN de apuntes: la visión la lee y se arma el juego', async () => {
    const buffer = readFileSync(process.env.LIVE_AI_IMAGE!);
    const mimeType = process.env.LIVE_AI_IMAGE!.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const description = await assistant.describeImage({ buffer, mimeType });
    console.log('Visión →', description.replace(/\s+/g, ' ').slice(0, 300));
    expect(description.length).toBeGreaterThan(20);

    const result = await useCase.execute({
      gameType: 'TRUE_FALSE_MAZE',
      files: [{ buffer, mimeType, filename: 'apuntes.png' }],
    });
    console.log('TF desde imagen →', result.content.length, 'afirmaciones | aviso:', result.notice);
    expect(result.content.length).toBeGreaterThanOrEqual(3);
    expect(result.notice).toBeUndefined();
  }, 300_000);
});
