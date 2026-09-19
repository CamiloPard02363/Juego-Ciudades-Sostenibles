import { describe, expect, it, vi } from 'vitest';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type {
  AiContentAssistant,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';
import type { ImageStorage, UploadedImage } from '../../domain/ports/image-storage.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { MemoryMatchContentValidator } from '../content-validators/memory-match.content-validator.js';
import { GuessWhoContentValidator } from '../content-validators/guess-who.content-validator.js';
import { DominoContentValidator } from '../content-validators/domino.content-validator.js';
import { MazeCollectorContentValidator } from '../content-validators/maze-collector.content-validator.js';
import { SnakesLaddersContentValidator } from '../content-validators/snakes-ladders.content-validator.js';
import { DualQuestContentValidator } from '../content-validators/dual-quest.content-validator.js';
import { DualQuestPixiContentValidator } from '../content-validators/dual-quest-pixi.content-validator.js';
import { FileTextExtractor, type SourceFile } from '../../infrastructure/ai/file-text-extractor.js';
import { GenerateGameDraftUseCase } from './generate-game-draft.use-case.js';

function buildRegistry(): ContentValidatorRegistry {
  return new ContentValidatorRegistry(
    new MemoryMatchContentValidator(),
    new GuessWhoContentValidator(),
    new DominoContentValidator(),
    new MazeCollectorContentValidator(),
    new SnakesLaddersContentValidator(),
    new DualQuestContentValidator(),
    new DualQuestPixiContentValidator(),
  );
}

function fakeAssistant(draft: GenerateGameDraftOutput): AiContentAssistant {
  return {
    describeImage: vi.fn().mockResolvedValue('descripción de la imagen'),
    generateGameDraft: vi.fn().mockResolvedValue(draft),
  };
}

/** Sube en memoria: cada imagen recibe una URL previsible según el orden de subida. */
function fakeImageStorage(): ImageStorage {
  let counter = 0;
  return {
    upload: vi.fn().mockImplementation(async (): Promise<UploadedImage> => {
      const id = counter++;
      return { url: `https://cdn.test/image-${id}.png`, publicId: `image-${id}` };
    }),
    uploadAudio: vi.fn(),
  };
}

function buildUseCase(assistant: AiContentAssistant, imageStorage: ImageStorage = fakeImageStorage()) {
  return new GenerateGameDraftUseCase(
    assistant,
    imageStorage,
    new FileTextExtractor(assistant),
    buildRegistry(),
  );
}

function csvFile(text: string): SourceFile {
  return { buffer: Buffer.from(text, 'utf-8'), mimeType: 'text/csv', filename: 'tema.csv' };
}

function imageFile(name: string): SourceFile {
  return { buffer: Buffer.from(`fake-image-${name}`), mimeType: 'image/png', filename: `${name}.png` };
}

const VALID_DOMINO_DRAFT: GenerateGameDraftOutput = {
  config: { handSize: 7 },
  content: [
    { label: 'Paneles solares', icon: 'star', color: '#22c55e' },
    { label: 'Turbinas eólicas', icon: 'star', color: '#3b82f6' },
    { label: 'Biomasa', icon: 'star', color: '#a16207' },
    { label: 'Hidroeléctrica', icon: 'star', color: '#0ea5e9' },
    { label: 'Geotermia', icon: 'star', color: '#f97316' },
    { label: 'Mareomotriz', icon: 'star', color: '#6366f1' },
  ],
};

function guessWhoDraftWithImages(count: number): GenerateGameDraftOutput {
  return {
    config: {},
    content: Array.from({ length: count }, (_, index) => ({
      imageIndex: index,
      label: `Concepto ${index}`,
    })),
  };
}

describe('GenerateGameDraftUseCase — tipos sin imagen obligatoria', () => {
  it('genera y valida un borrador de DOMINO a partir de un archivo', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);
    const result = await buildUseCase(assistant).execute({
      gameType: 'DOMINO',
      files: [csvFile('concepto,descripcion\nEnergía solar,...')],
    });

    expect(result.config).toEqual({ handSize: 7 });
    expect(result.content).toHaveLength(6);
  });

  it('rechaza un borrador que la IA devolvió inválido, con el mismo validador que la creación manual', async () => {
    const assistant = fakeAssistant({ config: { handSize: 999 }, content: VALID_DOMINO_DRAFT.content });

    await expect(
      buildUseCase(assistant).execute({ gameType: 'DOMINO', files: [csvFile('a,b')] }),
    ).rejects.toThrow(InvalidGameContentError);
  });

  it('rechaza gameType que el asistente de IA todavía no soporta, sin llamar a la IA', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    await expect(
      buildUseCase(assistant).execute({ gameType: 'DUAL_QUEST_PIXI', files: [csvFile('a,b')] }),
    ).rejects.toThrow(InvalidGameContentError);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('rechaza si no se sube ningún archivo', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    await expect(buildUseCase(assistant).execute({ gameType: 'DOMINO', files: [] })).rejects.toThrow(
      InvalidGameContentError,
    );
  });

  it('MEMORY_MATCH modo OPPOSITES normaliza posImageUrl/negImageUrl ausentes a null', async () => {
    const assistant = fakeAssistant({
      config: { mode: 'OPPOSITES' },
      content: [
        { posTitle: 'Ácido', posDescription: 'pH bajo', negTitle: 'Base', negDescription: 'pH alto' },
        { posTitle: 'Día', posDescription: 'Luz solar', negTitle: 'Noche', negDescription: 'Oscuridad' },
      ],
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'MEMORY_MATCH',
      mode: 'OPPOSITES',
      files: [csvFile('a,b')],
    });

    expect(result.content).toHaveLength(2);
    for (const pair of result.content as Array<Record<string, unknown>>) {
      expect(pair.posImageUrl).toBeNull();
      expect(pair.negImageUrl).toBeNull();
    }
  });
});

describe('GenerateGameDraftUseCase — tipos con imagen obligatoria (el usuario las sube, la IA las organiza)', () => {
  it('sube cada imagen y reemplaza el imageIndex de la IA por la URL real en GUESS_WHO', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(assistant, imageStorage).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 12 }, (_, i) => imageFile(`card-${i}`)),
    });

    expect(imageStorage.upload).toHaveBeenCalledTimes(12);
    expect(assistant.describeImage).toHaveBeenCalledTimes(12);
    expect(result.content).toHaveLength(12);
    const cards = result.content as Array<{ imageUrl: string; label: string }>;
    expect(cards[0].imageUrl).toBe('https://cdn.test/image-0.png');
    expect(cards[0]).not.toHaveProperty('imageIndex');
  });

  it('deja que el texto de referencia sea opcional cuando ya hay suficientes imágenes', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 12 }, (_, i) => imageFile(`card-${i}`)),
    });

    expect(result.content).toHaveLength(12);
  });

  it('rechaza si no llegan suficientes imágenes, sin llamar a la IA', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(5));

    await expect(
      buildUseCase(assistant).execute({
        gameType: 'GUESS_WHO',
        files: Array.from({ length: 5 }, (_, i) => imageFile(`card-${i}`)),
      }),
    ).rejects.toThrow(InvalidGameContentError);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('rechaza si la IA referencia un imageIndex fuera de rango', async () => {
    const assistant = fakeAssistant({
      config: {},
      content: [{ imageIndex: 99, label: 'Fuera de rango' }],
    });

    await expect(
      buildUseCase(assistant).execute({
        gameType: 'GUESS_WHO',
        files: Array.from({ length: 12 }, (_, i) => imageFile(`card-${i}`)),
      }),
    ).rejects.toThrow(InvalidGameContentError);
  });

  it('MEMORY_MATCH modo PAIRS también sube y organiza imágenes por índice', async () => {
    const assistant = fakeAssistant({
      config: { mode: 'PAIRS' },
      content: Array.from({ length: 4 }, (_, index) => ({ imageIndex: index, label: `Concepto ${index}` })),
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'MEMORY_MATCH',
      mode: 'PAIRS',
      files: Array.from({ length: 4 }, (_, i) => imageFile(`pair-${i}`)),
    });

    expect(result.content).toHaveLength(4);
    expect((result.content[0] as { imageUrl: string }).imageUrl).toBe('https://cdn.test/image-0.png');
  });
});
