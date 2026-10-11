import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type {
  AiContentAssistant,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';
import type { ImageStorage, UploadedImage } from '../../domain/ports/image-storage.port.js';
import type { ContentImageFinder, ImageCandidate } from '../../domain/ports/content-image-finder.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { MemoryMatchContentValidator } from '../content-validators/memory-match.content-validator.js';
import { GuessWhoContentValidator } from '../content-validators/guess-who.content-validator.js';
import { DominoContentValidator } from '../content-validators/domino.content-validator.js';
import { MazeCollectorContentValidator } from '../content-validators/maze-collector.content-validator.js';
import { SnakesLaddersContentValidator } from '../content-validators/snakes-ladders.content-validator.js';
import { DualQuestContentValidator } from '../content-validators/dual-quest.content-validator.js';
import { DualQuestPixiContentValidator } from '../content-validators/dual-quest-pixi.content-validator.js';
import { TrueFalseMazeContentValidator } from '../content-validators/true-false-maze.content-validator.js';
import { FileTextExtractor, type SourceFile } from '../../infrastructure/ai/file-text-extractor.js';
import { ContentImageResolver } from '../services/content-image-resolver.service.js';
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
    new TrueFalseMazeContentValidator(),
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

/**
 * Buscador de imágenes en memoria (issue #240): `results` mapea cada
 * búsqueda a sus candidatos; lo que no esté ahí no encuentra nada. Por
 * defecto no encuentra nada, que es lo que esperan los tests de antes.
 */
function fakeImageFinder(results: Record<string, string[]> = {}): ContentImageFinder {
  return {
    search: vi.fn().mockImplementation(async (query: string): Promise<ImageCandidate[]> =>
      (results[query] ?? []).map((url) => ({ url })),
    ),
    download: vi.fn().mockImplementation(async (candidate: ImageCandidate) =>
      candidate.url.includes('broken') ? null : { buffer: Buffer.from(candidate.url), mimeType: 'image/jpeg' },
    ),
  };
}

function buildUseCase(
  assistant: AiContentAssistant,
  imageStorage: ImageStorage = fakeImageStorage(),
  imageFinder: ContentImageFinder = fakeImageFinder(),
) {
  return new GenerateGameDraftUseCase(
    assistant,
    imageStorage,
    new FileTextExtractor(assistant),
    buildRegistry(),
    new ContentImageResolver(imageFinder, imageStorage),
  );
}

function csvFile(text: string): SourceFile {
  return { buffer: Buffer.from(text, 'utf-8'), mimeType: 'text/csv', filename: 'tema.csv' };
}

function imageFile(name: string): SourceFile {
  return { buffer: Buffer.from(`fake-image-${name}`), mimeType: 'image/png', filename: `${name}.png` };
}

// JPEG real y mínimo (96×96, un solo color) en base64 — issue #208, para
// construir un PDF de verdad con imágenes incrustadas de verdad, en vez de
// mockear la extracción. Generado una sola vez con @napi-rs/canvas (la misma
// librería que usa pdf-parse por debajo) y pegado acá como literal para que
// el test no dependa de esa librería en tiempo de ejecución.
const TEST_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCABgAGADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAUJ/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AiAI7QUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/9k='
const TEST_JPEG = Buffer.from(TEST_JPEG_BASE64, 'base64')

/**
 * Arma un PDF válido de verdad (con xref real, no un truco de parser
 * tolerante) con una imagen JPEG incrustada por página, vía DCTDecode — la
 * misma forma en que cualquier PDF real embebe fotos. Usado para probar
 * `executeWithContentImages` contra una extracción de imágenes real, no
 * mockeada (issue #208).
 */
function buildPdfWithEmbeddedImages(imageCount: number): Buffer {
  type Obj = { num: number; body?: string; bodyBuffer?: Buffer }
  const objects: Obj[] = [{ num: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' }]
  const pageNums: number[] = []
  let next = 3

  for (let i = 0; i < imageCount; i++) {
    const pageNum = next++
    const contentNum = next++
    const imageNum = next++
    pageNums.push(pageNum)
    const contentStream = `q 96 0 0 96 0 0 cm /Im${i} Do Q`
    objects.push({
      num: pageNum,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 96 96] /Resources << /XObject << /Im${i} ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>`,
    })
    objects.push({
      num: contentNum,
      body: `<< /Length ${Buffer.byteLength(contentStream)} >>\nstream\n${contentStream}\nendstream`,
    })
    objects.push({
      num: imageNum,
      bodyBuffer: Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width 96 /Height 96 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${TEST_JPEG.length} >>\nstream\n`,
        ),
        TEST_JPEG,
        Buffer.from('\nendstream'),
      ]),
    })
  }

  objects.push({
    num: 2,
    body: `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageNums.length} >>`,
  })
  objects.sort((a, b) => a.num - b.num)

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n')]
  const offsets = new Map<number, number>()
  let offset = chunks[0].length

  for (const obj of objects) {
    offsets.set(obj.num, offset)
    const body = obj.bodyBuffer ?? Buffer.from(obj.body!)
    const buf = Buffer.concat([Buffer.from(`${obj.num} 0 obj\n`), body, Buffer.from('\nendobj\n')])
    chunks.push(buf)
    offset += buf.length
  }

  const xrefStart = offset
  const maxNum = Math.max(...objects.map((o) => o.num))
  let xref = `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= maxNum; n++) {
    xref += `${String(offsets.get(n)).padStart(10, '0')} 00000 n \n`
  }
  chunks.push(Buffer.from(xref))
  chunks.push(Buffer.from(`trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`))

  return Buffer.concat(chunks)
}

function pdfFile(filename: string, imageCount: number): SourceFile {
  return { buffer: buildPdfWithEmbeddedImages(imageCount), mimeType: 'application/pdf', filename }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

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
    // Solo 2 conceptos: el dominó exige 6 y esto no se puede "arreglar" sin inventar contenido.
    const assistant = fakeAssistant({ config: { handSize: 7 }, content: (VALID_DOMINO_DRAFT.content as unknown[]).slice(0, 2) });

    await expect(
      buildUseCase(assistant).execute({ gameType: 'DOMINO', files: [csvFile('a,b')] }),
    ).rejects.toThrow(InvalidGameContentError);
  });

  it('corrige solo un parámetro fuera de rango en vez de rechazar todo el borrador', async () => {
    const assistant = fakeAssistant({ config: { handSize: 999 }, content: VALID_DOMINO_DRAFT.content });

    const result = await buildUseCase(assistant).execute({ gameType: 'DOMINO', files: [csvFile('a,b')] });

    expect(result.config).toEqual({ handSize: 12 });
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(1);
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

  it('suma el mensaje del usuario a las instrucciones que recibe la IA, sin reemplazarlas', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    await buildUseCase(assistant).execute({
      gameType: 'DOMINO',
      message: 'Enfócate en energías renovables poco comunes.',
      files: [csvFile('concepto,descripcion\nEnergía solar,...')],
    });

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.instructions).toContain('Enfócate en energías renovables poco comunes.');
    // La instrucción del usuario va antes que la forma de JSON esperada, no la reemplaza.
    expect(call.instructions.indexOf('Instrucciones del usuario')).toBeLessThan(
      call.instructions.indexOf('Forma de JSON esperada'),
    );
  });

  it('no agrega la sección de instrucciones del usuario cuando no manda mensaje', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    await buildUseCase(assistant).execute({
      gameType: 'DOMINO',
      files: [csvFile('concepto,descripcion\nEnergía solar,...')],
    });

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.instructions).not.toContain('Instrucciones del usuario');
  });
});

describe('GenerateGameDraftUseCase — generar solo con texto, sin archivos (issue #234)', () => {
  it('genera un borrador de DOMINO sin ningún archivo, usando solo el mensaje del usuario', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    const result = await buildUseCase(assistant).execute({
      gameType: 'DOMINO',
      message: 'Energías renovables: solar, eólica, biomasa, hidroeléctrica, geotermia, mareomotriz.',
      files: [],
    });

    expect(result.content).toHaveLength(6);
    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.instructions).toContain('Energías renovables');
    // Sin archivos, el "texto fuente" que recibe la IA es el aviso de respaldo, no texto vacío.
    expect(call.sourceText).toContain('no adjuntó archivos');
  });

  it('MEMORY_MATCH modo OPPOSITES también genera solo con texto, sin archivos', async () => {
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
      message: 'Química: ácidos y bases.',
      files: [],
    });

    expect(result.content).toHaveLength(2);
  });

  it('rechaza si no hay archivos NI mensaje, sin llamar a la IA', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    await expect(buildUseCase(assistant).execute({ gameType: 'DOMINO', files: [] })).rejects.toThrow(
      InvalidGameContentError,
    );
    await expect(
      buildUseCase(assistant).execute({ gameType: 'DOMINO', message: '   ', files: [] }),
    ).rejects.toThrow(InvalidGameContentError);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('combina archivos y mensaje cuando ambos llegan (el mensaje no reemplaza el texto extraído)', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);

    await buildUseCase(assistant).execute({
      gameType: 'DOMINO',
      message: 'Dale énfasis a la energía solar.',
      files: [csvFile('concepto,descripcion\nEnergía solar,la más usada')],
    });

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.sourceText).toContain('Energía solar');
    expect(call.instructions).toContain('Dale énfasis a la energía solar.');
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

  it('MEMORY_MATCH modo PAIRS rechaza si no llegan suficientes imágenes, sin llamar a la IA', async () => {
    const assistant = fakeAssistant({
      config: { mode: 'PAIRS' },
      content: Array.from({ length: 2 }, (_, index) => ({ imageIndex: index, label: `Concepto ${index}` })),
    });

    await expect(
      buildUseCase(assistant).execute({
        gameType: 'MEMORY_MATCH',
        mode: 'PAIRS',
        files: Array.from({ length: 2 }, (_, i) => imageFile(`pair-${i}`)),
      }),
    ).rejects.toThrow(InvalidGameContentError);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('rechaza si el único archivo es un documento sin texto legible y no hay mensaje, sin llamar a la IA', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(0));

    await expect(
      buildUseCase(assistant).execute({ gameType: 'GUESS_WHO', files: [csvFile('')] }),
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

describe('GenerateGameDraftUseCase — tipos con imagen obligatoria, pero SIN ninguna imagen (issue #238)', () => {
  it('GUESS_WHO genera el borrador completo solo con el mensaje, sin llamar a describeImage, y la IA crea la imagen de cada tarjeta', async () => {
    const assistant = fakeAssistant({
      config: {},
      content: Array.from({ length: 12 }, (_, index) => ({
        label: `País ${index}`,
        info: `Dato ${index}`,
      })),
    });
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(assistant, imageStorage).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas de Sudamérica.',
      files: [],
    });

    expect(result.content).toHaveLength(12);
    // Wikimedia no encontró nada (fakeImageFinder vacío): cada tarjeta recibe su ilustración básica.
    for (const card of result.content as Array<Record<string, unknown>>) {
      expect(card.imageUrl).toMatch(/^https:\/\/cdn\.test\/image-\d+\.png$/);
    }
    expect(imageStorage.upload).toHaveBeenCalledTimes(12);
    expect(assistant.describeImage).not.toHaveBeenCalled();

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.instructions).toContain('Banderas de Sudamérica.');
    // Usa las instrucciones SIN imagen (textOnlyInstructions), no las que dan por hecho que hay imágenes.
    expect(call.instructions).toContain('el usuario no subió imágenes');
    expect(call.instructions).toContain('imageQuery');
    expect(call.instructions).toContain('emoji');
    expect(call.imageDescriptions).toBeUndefined();
    expect(result.notice).toMatch(/ilustración básica/);
  });

  it('MEMORY_MATCH modo PAIRS también genera sin ninguna imagen, usando solo el mensaje', async () => {
    const assistant = fakeAssistant({
      config: { mode: 'PAIRS' },
      content: [{ label: '2 + 2' }, { label: 'Triángulo' }, { label: 'Número primo' }, { label: 'Círculo' }],
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'MEMORY_MATCH',
      mode: 'PAIRS',
      message: 'Matemáticas básicas.',
      files: [],
    });

    expect(result.content).toHaveLength(4);
    for (const pair of result.content as Array<Record<string, unknown>>) {
      expect(pair.imageUrl).not.toBeNull();
    }
  });

  it('descarta cualquier imageIndex que la IA devuelva de más cuando no hay imágenes', async () => {
    const assistant = fakeAssistant({
      config: {},
      content: Array.from({ length: 12 }, (_, index) => ({
        imageIndex: index, // la IA no debía incluir esto, pero si lo hace, se descarta
        label: `País ${index}`,
      })),
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    for (const card of result.content as Array<Record<string, unknown>>) {
      expect(card).not.toHaveProperty('imageIndex');
      expect(card.imageUrl).not.toBeNull();
    }
  });

  it('sigue rechazando sin archivos NI mensaje, sin llamar a la IA (ninguna de las dos fuentes)', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(0));

    await expect(buildUseCase(assistant).execute({ gameType: 'GUESS_WHO', files: [] })).rejects.toThrow(
      InvalidGameContentError,
    );
    await expect(
      buildUseCase(assistant).execute({ gameType: 'GUESS_WHO', message: '   ', files: [] }),
    ).rejects.toThrow(InvalidGameContentError);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('un documento sin imágenes incrustadas (CSV) aporta texto de contexto además del mensaje', async () => {
    const assistant = fakeAssistant({
      config: {},
      content: Array.from({ length: 12 }, (_, index) => ({ label: `País ${index}` })),
    });

    await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas de Sudamérica.',
      files: [csvFile('pais,capital\nArgentina,Buenos Aires')],
    });

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.sourceText).toContain('Argentina');
  });
});

describe('GenerateGameDraftUseCase — la IA consigue las imágenes que faltan (issue #240)', () => {
  function flagsDraft(count: number) {
    return {
      config: {},
      content: Array.from({ length: count }, (_, index) => ({
        label: `País ${index}`,
        info: `Dato ${index}`,
        imageQuery: `Flag ${index}`,
      })),
    };
  }

  it('busca una imagen por tarjeta con el imageQuery del modelo, la sube y la asigna en orden', async () => {
    const results = Object.fromEntries(
      Array.from({ length: 12 }, (_, index) => [`Flag ${index}`, [`https://img.test/flag-${index}.png`]]),
    );
    const finder = fakeImageFinder(results);
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), imageStorage, finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const cards = result.content as Array<Record<string, unknown>>;
    expect(cards).toHaveLength(12);
    for (const card of cards) {
      expect(card.imageUrl).toMatch(/^https:\/\/cdn\.test\/image-\d+\.png$/);
      expect(card).not.toHaveProperty('imageQuery');
    }
    // Cada tarjeta recibe la imagen que se descargó para SU búsqueda.
    const uploads = vi.mocked(imageStorage.upload).mock.calls.map(([buffer]) => buffer.toString());
    expect(uploads).toHaveLength(12);
    expect(new Set(cards.map((card) => card.imageUrl)).size).toBe(12);
    expect(vi.mocked(imageStorage.upload).mock.calls[0][1]).toBe('guess-who-cards');
    expect(finder.search).toHaveBeenCalledWith('Flag 0', 'País 0');
    expect(result.notice).toMatch(/consiguió las 12 imágenes/);
  });

  it('nunca repite la misma imagen en dos tarjetas: usa el siguiente candidato libre', async () => {
    const finder = fakeImageFinder({
      'Flag 0': ['https://img.test/shared.png'],
      'Flag 1': ['https://img.test/shared.png?v=2', 'https://img.test/other.png'],
    });

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), fakeImageStorage(), finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const downloaded = vi.mocked(finder.download).mock.calls.map(([candidate]) => candidate.url);
    expect(downloaded).toEqual(['https://img.test/shared.png', 'https://img.test/other.png']);
    const cards = result.content as Array<Record<string, unknown>>;
    expect(cards[0].imageUrl).not.toBeNull();
    expect(cards[1].imageUrl).not.toBeNull();
    expect(cards[0].imageUrl).not.toBe(cards[1].imageUrl);
  });

  it('a las tarjetas sin foto (no encontrada o no descargable) la IA les crea una ilustración básica y lo avisa', async () => {
    const finder = fakeImageFinder({
      'Flag 0': ['https://img.test/flag-0.png'],
      'Flag 1': ['https://img.test/broken.png'],
    });
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), imageStorage, finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const cards = result.content as Array<Record<string, unknown>>;
    expect(cards.every((card) => card.imageUrl !== null)).toBe(true);
    // 1 foto de Wikimedia + 11 ilustraciones, todas subidas como imagen.
    expect(imageStorage.upload).toHaveBeenCalledTimes(12);
    const uploadedBuffers = vi.mocked(imageStorage.upload).mock.calls.map(([buffer]) => buffer.toString());
    expect(uploadedBuffers.filter((text) => text.startsWith('<svg'))).toHaveLength(11);
    expect(result.notice).toMatch(/1 fotos en Wikimedia Commons y creó 11 ilustraciones básicas/);
  });

  it('con AI_CONTENT_IMAGE_SOURCES=wikimedia deja sin imagen las que no encontró y lo avisa (comportamiento anterior)', async () => {
    vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', 'wikimedia');
    const finder = fakeImageFinder({ 'Flag 0': ['https://img.test/flag-0.png'] });

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), fakeImageStorage(), finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const cards = result.content as Array<Record<string, unknown>>;
    expect(cards[0].imageUrl).not.toBeNull();
    expect(cards.slice(1).every((card) => card.imageUrl === null)).toBe(true);
    expect(result.notice).toMatch(/1 de 12 imágenes/);
  });

  it('con AI_CONTENT_IMAGE_SOURCES=ai ni siquiera consulta Wikimedia', async () => {
    vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', 'ai');
    const finder = fakeImageFinder({ 'Flag 0': ['https://img.test/flag-0.png'] });

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), fakeImageStorage(), finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    expect(finder.search).not.toHaveBeenCalled();
    expect((result.content as Array<Record<string, unknown>>).every((card) => card.imageUrl !== null)).toBe(true);
    expect(result.notice).toMatch(/ilustración básica para las 12/);
  });

  it('si el almacenamiento no está configurado, la ilustración va embebida en la URL y el borrador no se cae', async () => {
    const imageStorage = fakeImageStorage();
    vi.mocked(imageStorage.upload).mockRejectedValue(new ServiceUnavailableException('sin Cloudinary'));

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), imageStorage, fakeImageFinder()).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const cards = result.content as Array<{ imageUrl: string }>;
    expect(cards).toHaveLength(12);
    for (const card of cards) {
      expect(card.imageUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
      expect(card.imageUrl.length).toBeLessThan(2048);
    }
    // Tras el primer "no configurado" no se insiste con el resto.
    expect(vi.mocked(imageStorage.upload).mock.calls.length).toBeLessThan(12);
  });

  it('si la subida de una ilustración falla por un error pasajero, esa tarjeta la lleva embebida y el resto sigue normal', async () => {
    const draft = flagsDraft(12);
    (draft.content[0] as Record<string, unknown>).emoji = '🦊';
    const imageStorage = fakeImageStorage();
    const okUpload = vi.mocked(imageStorage.upload).getMockImplementation()!;
    vi.mocked(imageStorage.upload).mockImplementation(async (buffer, folder) => {
      if (buffer.toString().includes('🦊')) throw new Error('timeout de red');
      return okUpload(buffer, folder);
    });

    const result = await buildUseCase(fakeAssistant(draft), imageStorage, fakeImageFinder()).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const cards = result.content as Array<{ imageUrl: string }>;
    expect(cards[0].imageUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(Buffer.from(cards[0].imageUrl.split(',')[1], 'base64').toString()).toContain('🦊');
    expect(cards.slice(1).every((card) => card.imageUrl.startsWith('https://cdn.test/'))).toBe(true);
  });

  it('sin imageQuery del modelo, busca por el label', async () => {
    const finder = fakeImageFinder({ Cubo: ['https://img.test/cube.png'] });
    const assistant = fakeAssistant({
      config: { mode: 'PAIRS' },
      content: [{ label: 'Cubo' }, { label: 'Esfera' }, { label: 'Cono' }, { label: 'Cilindro' }],
    });

    const result = await buildUseCase(assistant, fakeImageStorage(), finder).execute({
      gameType: 'MEMORY_MATCH',
      mode: 'PAIRS',
      message: 'Sólidos geométricos.',
      files: [],
    });

    expect(finder.search).toHaveBeenCalledWith('Cubo', 'Cubo');
    expect((result.content as Array<Record<string, unknown>>)[0].imageUrl).not.toBeNull();
  });

  it('no busca imágenes cuando el usuario sí subió las suyas', async () => {
    const finder = fakeImageFinder();
    await buildUseCase(fakeAssistant(guessWhoDraftWithImages(12)), fakeImageStorage(), finder).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 12 }, (_, index) => imageFile(`foto-${index}`)),
    });

    expect(finder.search).not.toHaveBeenCalled();
  });
});

describe('GenerateGameDraftUseCase — GUESS_WHO sin mínimo estricto de imágenes (issue #208)', () => {
  it('genera igual con menos imágenes que la cantidad recomendada, sin rechazarlo', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(3));

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 3 }, (_, i) => imageFile(`card-${i}`)),
    });

    expect(result.content).toHaveLength(3);
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(1);
  });

  it('extrae de verdad las imágenes incrustadas en un PDF y las trata como cargas sueltas', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(2));
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(assistant, imageStorage).execute({
      gameType: 'GUESS_WHO',
      // Un solo archivo PDF, cero imágenes sueltas — las 2 fotos incrustadas
      // en el PDF (de verdad, no mockeadas) deben contar como la carga.
      files: [pdfFile('banderas.pdf', 2)],
    });

    expect(imageStorage.upload).toHaveBeenCalledTimes(2);
    expect(assistant.describeImage).toHaveBeenCalledTimes(2);
    expect(result.content).toHaveLength(2);
  });

  it('combina imágenes sueltas con imágenes incrustadas en un PDF en la misma generación', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(3));
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(assistant, imageStorage).execute({
      gameType: 'GUESS_WHO',
      files: [imageFile('card-suelta'), pdfFile('banderas.pdf', 2)],
    });

    expect(imageStorage.upload).toHaveBeenCalledTimes(3);
    expect(result.content).toHaveLength(3);
  });

  it('un PDF corrupto no tumba la generación: simplemente no aporta imágenes incrustadas', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(2));
    const corruptPdf: SourceFile = {
      buffer: Buffer.from('esto no es un PDF de verdad'),
      mimeType: 'application/pdf',
      filename: 'roto.pdf',
    };

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      files: [imageFile('card-0'), imageFile('card-1'), corruptPdf],
    });

    // Las 2 imágenes sueltas sí se procesan con normalidad; el PDF roto solo
    // no aporta imágenes propias (no revienta la petición completa).
    expect(result.content).toHaveLength(2);
  });
});

describe('GenerateGameDraftUseCase — autocorrección: la IA corrige lo que el validador rechaza (issue #21)', () => {
  const INVALID_DOMINO: GenerateGameDraftOutput = {
    config: { handSize: 7 },
    content: (VALID_DOMINO_DRAFT.content as unknown[]).slice(0, 2),
  };

  it('si el primer borrador es inválido, se lo devuelve a la IA con el motivo exacto y usa el segundo', async () => {
    const assistant = fakeAssistant(INVALID_DOMINO);
    vi.mocked(assistant.generateGameDraft)
      .mockResolvedValueOnce(INVALID_DOMINO)
      .mockResolvedValueOnce(VALID_DOMINO_DRAFT);

    const result = await buildUseCase(assistant).execute({
      gameType: 'DOMINO',
      message: 'Energías renovables.',
      files: [],
    });

    expect(result.content).toHaveLength(6);
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(2);
    const [first, second] = vi.mocked(assistant.generateGameDraft).mock.calls.map(([call]) => call);
    expect(first.instructions).not.toContain('RECHAZADA');
    expect(second.instructions).toContain('RECHAZADA');
    expect(second.instructions).toContain('al menos 6 conceptos');
    // El motivo se suma al final de las MISMAS instrucciones; no las reemplaza.
    expect(second.instructions.startsWith(first.instructions)).toBe(true);
  });

  it('se rinde tras 3 intentos en total, con un mensaje que dice qué sigue mal', async () => {
    const assistant = fakeAssistant(INVALID_DOMINO);

    await expect(
      buildUseCase(assistant).execute({ gameType: 'DOMINO', message: 'Energías.', files: [] }),
    ).rejects.toThrow(/después de 3 intentos.*al menos 6 conceptos/);
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(3);
  });

  it('un JSON ilegible del proveedor (error de contenido del adaptador) también se reintenta', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);
    vi.mocked(assistant.generateGameDraft)
      .mockRejectedValueOnce(new InvalidGameContentError('la IA devolvió una respuesta que no es JSON válido.'))
      .mockResolvedValueOnce(VALID_DOMINO_DRAFT);

    const result = await buildUseCase(assistant).execute({ gameType: 'DOMINO', message: 'Energías.', files: [] });

    expect(result.content).toHaveLength(6);
    expect(vi.mocked(assistant.generateGameDraft).mock.calls[1][0].instructions).toContain('no es JSON válido');
  });

  it('un fallo del proveedor (cuota, red, key) NO se reintenta: se propaga tal cual', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);
    vi.mocked(assistant.generateGameDraft).mockRejectedValue(new ServiceUnavailableException('cuota agotada'));

    await expect(
      buildUseCase(assistant).execute({ gameType: 'DOMINO', message: 'Energías.', files: [] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(1);
  });

  it('un imageIndex inventado se corrige reintentando, sin volver a leer ni subir las imágenes del usuario', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    vi.mocked(assistant.generateGameDraft)
      .mockResolvedValueOnce({ config: {}, content: [{ imageIndex: 99, label: 'Fuera de rango' }] })
      .mockResolvedValueOnce(guessWhoDraftWithImages(12));
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(assistant, imageStorage).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 12 }, (_, i) => imageFile(`card-${i}`)),
    });

    expect(result.content).toHaveLength(12);
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(2);
    expect(vi.mocked(assistant.generateGameDraft).mock.calls[1][0].instructions).toContain('imageIndex');
    expect(assistant.describeImage).toHaveBeenCalledTimes(12);
    expect(imageStorage.upload).toHaveBeenCalledTimes(12);
  });

  it('el reintento reutiliza el mismo texto fuente y las mismas descripciones de imágenes', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    vi.mocked(assistant.generateGameDraft)
      .mockResolvedValueOnce({ config: {}, content: [{ imageIndex: 99, label: 'x' }] })
      .mockResolvedValueOnce(guessWhoDraftWithImages(12));

    await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 12 }, (_, i) => imageFile(`card-${i}`)),
    });

    const [first, second] = vi.mocked(assistant.generateGameDraft).mock.calls.map(([call]) => call);
    expect(second.sourceText).toBe(first.sourceText);
    expect(second.imageDescriptions).toEqual(first.imageDescriptions);
  });
});

describe('GenerateGameDraftUseCase — tolera descuidos de forma de la IA (issue #21)', () => {
  it('TRUE_FALSE_MAZE: acepta "Verdadero"/"Falso" como texto, acota la config, quita repetidas y recorta la explicación', async () => {
    const assistant = fakeAssistant({
      config: {
        lives: 9,
        enemyCount: '2',
        enemySpeed: 0,
        relocateSeconds: 25,
        shuffleQuestions: 'true',
        lightsOut: 'no',
        skin: 'OTRO',
      },
      content: [
        { statement: 'Las plantas producen oxígeno.', answer: 'Verdadero', explanation: 'x'.repeat(300) },
        { statement: 'las plantas producen oxígeno.', answer: true },
        { statement: 'La fotosíntesis ocurre en las mitocondrias.', answer: 'falso', explanation: 'Ocurre en los cloroplastos.' },
        { statement: 'El agua es necesaria para la fotosíntesis.', answer: 1 },
      ],
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'TRUE_FALSE_MAZE',
      message: 'Fotosíntesis, nivel fácil.',
      files: [],
    });

    expect(result.config).toEqual({
      skin: 'NAVE_ESPACIAL',
      lives: 5,
      enemyCount: 2,
      enemySpeed: 1,
      relocateSeconds: 20,
      shuffleQuestions: true,
      lightsOut: false,
    });
    const questions = result.content as Array<{ statement: string; answer: boolean; explanation?: string }>;
    expect(questions).toHaveLength(3);
    expect(questions.map((question) => question.answer)).toEqual([true, false, true]);
    expect(questions[0].explanation).toHaveLength(240);
    expect(assistant.generateGameDraft).toHaveBeenCalledTimes(1);
  });

  it('MEMORY_MATCH modo PAIRS: fuerza mode PAIRS aunque la IA lo omita o ponga otro', async () => {
    const assistant = fakeAssistant({
      config: { mode: 'OPPOSITES', perZone: 500 },
      content: [{ label: 'Cubo' }, { label: 'Esfera' }, { label: 'Cono' }, { label: 'Cilindro' }],
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'MEMORY_MATCH',
      mode: 'PAIRS',
      message: 'Sólidos geométricos.',
      files: [],
    });

    expect(result.config).toMatchObject({ mode: 'PAIRS', perZone: 20 });
    expect(result.content).toHaveLength(4);
  });

  it('DOMINO: recorta a 10 conceptos, acorta etiquetas largas y repara colores inválidos', async () => {
    const assistant = fakeAssistant({
      config: { handSize: 7 },
      content: [
        ...Array.from({ length: 11 }, (_, index) => ({ label: `Concepto ${index}`, icon: 'star', color: 'verde' })),
        { label: 'z'.repeat(80), icon: 'star', color: '#22c55e' },
      ],
    });

    const result = await buildUseCase(assistant).execute({ gameType: 'DOMINO', message: 'Energías.', files: [] });

    const concepts = result.content as Array<{ label: string; color: string }>;
    expect(concepts).toHaveLength(10);
    expect(concepts.every((concept) => /^#[0-9a-f]{6}$/i.test(concept.color))).toBe(true);
  });

  it('acepta que la IA envuelva la lista en un objeto ({ "items": [...] })', async () => {
    const assistant = fakeAssistant({
      config: { handSize: 7 },
      content: { items: VALID_DOMINO_DRAFT.content },
    });

    const result = await buildUseCase(assistant).execute({ gameType: 'DOMINO', message: 'Energías.', files: [] });

    expect(result.content).toHaveLength(6);
  });
});

describe('GenerateGameDraftUseCase — Laberinto Verdadero o Falso: solo texto o imágenes (issue #21)', () => {
  const TF_DRAFT: GenerateGameDraftOutput = {
    config: { skin: 'NAVE_ESPACIAL', lives: 5, enemyCount: 1, enemySpeed: 1, relocateSeconds: 0, shuffleQuestions: true, lightsOut: false },
    content: Array.from({ length: 8 }, (_, index) => ({
      statement: `Afirmación número ${index} sobre la fotosíntesis.`,
      answer: index % 2 === 0,
      explanation: `Porque sí ${index}.`,
    })),
  };

  it('se parametriza con solo el tema, sin archivos, y respeta la dificultad que pidió el usuario', async () => {
    const assistant = fakeAssistant(TF_DRAFT);

    const result = await buildUseCase(assistant).execute({
      gameType: 'TRUE_FALSE_MAZE',
      message: 'La fotosíntesis, nivel fácil para primaria.',
      files: [],
    });

    expect(result.content).toHaveLength(8);
    expect(result.config).toMatchObject({ lives: 5, enemyCount: 1, enemySpeed: 1, lightsOut: false });
    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.instructions).toContain('nivel fácil para primaria');
    // La IA conoce los parámetros de la partida y cómo se relacionan con la dificultad.
    expect(call.instructions).toContain('relocateSeconds');
    expect(call.instructions).toContain('lightsOut');
    expect(call.instructions).toContain('FÁCIL');
    expect(assistant.describeImage).not.toHaveBeenCalled();
  });

  it('con una imagen de apuntes como única fuente, la IA la lee y arma el juego con esa descripción', async () => {
    const assistant = fakeAssistant(TF_DRAFT);
    vi.mocked(assistant.describeImage).mockResolvedValue('La fotosíntesis ocurre en los cloroplastos.');

    const result = await buildUseCase(assistant).execute({
      gameType: 'TRUE_FALSE_MAZE',
      files: [imageFile('apuntes')],
    });

    expect(result.content).toHaveLength(8);
    expect(result.notice).toBeUndefined();
    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.sourceText).toContain('cloroplastos');
    expect(call.sourceText).toContain('apuntes.png');
  });

  it('si no puede leer la imagen pero hay tema escrito, genera igual y avisa qué no se leyó', async () => {
    const assistant = fakeAssistant(TF_DRAFT);
    vi.mocked(assistant.describeImage).mockRejectedValue(new Error('visión no disponible'));

    const result = await buildUseCase(assistant).execute({
      gameType: 'TRUE_FALSE_MAZE',
      message: 'La fotosíntesis.',
      files: [imageFile('apuntes')],
    });

    expect(result.content).toHaveLength(8);
    expect(result.notice).toMatch(/No se pudo leer: apuntes\.png/);
    expect(vi.mocked(assistant.generateGameDraft).mock.calls[0][0].sourceText).toContain('no se pudo leer ningún archivo');
  });

  it('si no puede leer la imagen y tampoco hay tema, lo explica sin gastar una llamada de generación', async () => {
    const assistant = fakeAssistant(TF_DRAFT);
    vi.mocked(assistant.describeImage).mockRejectedValue(new Error('visión no disponible'));

    await expect(
      buildUseCase(assistant).execute({ gameType: 'TRUE_FALSE_MAZE', files: [imageFile('apuntes')] }),
    ).rejects.toThrow(/no pudo leer el contenido de las imágenes/);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('combina una foto de apuntes y el tema escrito', async () => {
    const assistant = fakeAssistant(TF_DRAFT);
    vi.mocked(assistant.describeImage).mockResolvedValue('Cloroplastos y clorofila.');

    await buildUseCase(assistant).execute({
      gameType: 'TRUE_FALSE_MAZE',
      message: 'Nivel difícil.',
      files: [imageFile('apuntes')],
    });

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.sourceText).toContain('Cloroplastos');
    expect(call.instructions).toContain('Nivel difícil.');
  });

  it('avisa cuando el texto era tan largo que la IA solo usó la primera parte', async () => {
    const assistant = fakeAssistant({ ...TF_DRAFT, sourceTruncated: true } as GenerateGameDraftOutput);

    const result = await buildUseCase(assistant).execute({
      gameType: 'TRUE_FALSE_MAZE',
      files: [csvFile('tema,detalle\nFotosíntesis,mucho texto')],
    });

    expect(result.notice).toMatch(/muy largo/);
  });
});

describe('GenerateGameDraftUseCase — ¿Quién Es? / Parejas con imágenes del usuario y lectura de imágenes que falla (issue #21)', () => {
  function namedImage(name: string): SourceFile {
    return { buffer: Buffer.from(`fake-${name}`), mimeType: 'image/png', filename: name };
  }

  it('las imágenes del usuario son las que se usan: no se busca ni se crea ninguna otra', async () => {
    const finder = fakeImageFinder();
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(fakeAssistant(guessWhoDraftWithImages(12)), imageStorage, finder).execute({
      gameType: 'GUESS_WHO',
      files: Array.from({ length: 12 }, (_, index) => imageFile(`foto-${index}`)),
    });

    expect(finder.search).not.toHaveBeenCalled();
    // Solo se suben las 12 del usuario (ninguna ilustración SVG).
    expect(imageStorage.upload).toHaveBeenCalledTimes(12);
    const buffers = vi.mocked(imageStorage.upload).mock.calls.map(([buffer]) => buffer.toString());
    expect(buffers.every((text) => text.startsWith('fake-image-'))).toBe(true);
    expect((result.content as Array<{ imageUrl: string }>).map((card) => card.imageUrl)).toEqual(
      Array.from({ length: 12 }, (_, index) => `https://cdn.test/image-${index}.png`),
    );
  });

  it('sin poder leer ninguna imagen, usa el nombre del archivo como pista y lo avisa', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    vi.mocked(assistant.describeImage).mockRejectedValue(new Error('límite de uso'));
    const names = Array.from({ length: 12 }, (_, index) => `bandera-pais-${index}.png`);

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      files: names.map(namedImage),
    });

    expect(result.content).toHaveLength(12);
    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.imageDescriptions?.[0]).toContain('por el nombre del archivo parece ser: "bandera pais 0"');
    expect(result.notice).toMatch(/no pudo leer el contenido de 12 de 12 imágenes/);
  });

  it('sin poder leer las imágenes y con nombres genéricos (IMG_0001) y sin tema, se detiene ANTES de subir nada', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    vi.mocked(assistant.describeImage).mockRejectedValue(new Error('límite de uso'));
    const imageStorage = fakeImageStorage();

    await expect(
      buildUseCase(assistant, imageStorage).execute({
        gameType: 'GUESS_WHO',
        files: Array.from({ length: 12 }, (_, index) => namedImage(`IMG_${String(index).padStart(4, '0')}.png`)),
      }),
    ).rejects.toThrow(/no pudo leer tus imágenes/);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
    expect(imageStorage.upload).not.toHaveBeenCalled();
  });

  it('con nombres genéricos pero con el tema escrito, sigue adelante', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    vi.mocked(assistant.describeImage).mockRejectedValue(new Error('límite de uso'));

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas de Sudamérica, en orden alfabético.',
      files: Array.from({ length: 12 }, (_, index) => namedImage(`IMG_${String(index).padStart(4, '0')}.png`)),
    });

    expect(result.content).toHaveLength(12);
    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.imageDescriptions?.[0]).toContain('no se pudo leer esta imagen');
  });

  it('si solo falla la lectura de algunas imágenes, avisa cuántas', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(12));
    let calls = 0;
    vi.mocked(assistant.describeImage).mockImplementation(async () => {
      calls += 1;
      if (calls > 8) throw new Error('límite de uso');
      return 'una bandera';
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: Array.from({ length: 12 }, (_, index) => imageFile(`pais-${index}`)),
    });

    expect(result.content).toHaveLength(12);
    expect(result.notice).toMatch(/4 de 12 imágenes/);
  });

  it('un documento de texto (CSV) sin mensaje ni imágenes alcanza como fuente: la IA crea el contenido y las imágenes', async () => {
    const assistant = fakeAssistant({
      config: {},
      content: Array.from({ length: 12 }, (_, index) => ({ label: `País ${index}`, emoji: '🏳️' })),
    });

    const result = await buildUseCase(assistant).execute({
      gameType: 'GUESS_WHO',
      files: [csvFile('pais,capital\nArgentina,Buenos Aires')],
    });

    expect(result.content).toHaveLength(12);
    expect((result.content as Array<{ imageUrl: string | null }>).every((card) => card.imageUrl !== null)).toBe(true);
    expect(vi.mocked(assistant.generateGameDraft).mock.calls[0][0].sourceText).toContain('Argentina');
  });

  it('usa el emoji y el color que eligió la IA en la ilustración, y ignora los inválidos sin romperse', async () => {
    const assistant = fakeAssistant({
      config: {},
      content: [
        { label: 'Águila', emoji: '🦅', color: '#bae6fd' },
        { label: 'Jaguar', emoji: '<script>alert(1)</script>', color: 'rojo' },
        { label: 'Ceiba', emoji: 42, color: null },
        { label: 'Cóndor' },
      ],
    });
    const imageStorage = fakeImageStorage();

    const result = await buildUseCase(assistant, imageStorage).execute({
      gameType: 'MEMORY_MATCH',
      mode: 'PAIRS',
      message: 'Aves y árboles.',
      files: [],
    });

    expect(result.content).toHaveLength(4);
    const svgs = vi.mocked(imageStorage.upload).mock.calls.map(([buffer]) => buffer.toString());
    expect(svgs).toHaveLength(4);
    expect(svgs.some((svg) => svg.includes('🦅'))).toBe(true);
    for (const svg of svgs) {
      expect(svg).not.toContain('<script');
      expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
    }
  });
});
