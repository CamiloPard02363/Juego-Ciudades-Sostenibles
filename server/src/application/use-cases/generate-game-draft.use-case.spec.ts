import { describe, expect, it, vi } from 'vitest';
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
    imageFinder,
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

  it('rechaza si no se sube ninguna imagen, sin importar el tipo de juego (mínimo absoluto: 1)', async () => {
    const assistant = fakeAssistant(guessWhoDraftWithImages(0));

    await expect(
      buildUseCase(assistant).execute({ gameType: 'GUESS_WHO', files: [csvFile('a,b')] }),
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
  it('GUESS_WHO genera el borrador completo solo con el mensaje, sin llamar a describeImage (y sin subir nada si no encuentra imágenes)', async () => {
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
    for (const card of result.content as Array<Record<string, unknown>>) {
      expect(card.imageUrl).toBeNull();
    }
    expect(imageStorage.upload).not.toHaveBeenCalled();
    expect(assistant.describeImage).not.toHaveBeenCalled();

    const call = vi.mocked(assistant.generateGameDraft).mock.calls[0][0];
    expect(call.instructions).toContain('Banderas de Sudamérica.');
    // Usa las instrucciones SIN imagen (textOnlyInstructions), no las que dan por hecho que hay imágenes.
    expect(call.instructions).toContain('el usuario no subió imágenes');
    expect(call.instructions).toContain('imageQuery');
    expect(call.imageDescriptions).toBeUndefined();
    expect(result.notice).toMatch(/no encontró imágenes/);
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
      expect(pair.imageUrl).toBeNull();
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
      expect(card.imageUrl).toBeNull();
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

  it('deja sin imagen solo las que no encontró (o no pudo descargar) y lo avisa', async () => {
    const finder = fakeImageFinder({
      'Flag 0': ['https://img.test/flag-0.png'],
      'Flag 1': ['https://img.test/broken.png'],
    });

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), fakeImageStorage(), finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    const cards = result.content as Array<Record<string, unknown>>;
    expect(cards[0].imageUrl).not.toBeNull();
    expect(cards[1].imageUrl).toBeNull();
    expect(cards.slice(2).every((card) => card.imageUrl === null)).toBe(true);
    expect(result.notice).toMatch(/1 de 12 imágenes/);
  });

  it('si el almacenamiento falla, el borrador se genera igual (sin imágenes), no se cae', async () => {
    const finder = fakeImageFinder({ 'Flag 0': ['https://img.test/flag-0.png'] });
    const imageStorage = fakeImageStorage();
    vi.mocked(imageStorage.upload).mockRejectedValue(new Error('Cloudinary no configurado'));

    const result = await buildUseCase(fakeAssistant(flagsDraft(12)), imageStorage, finder).execute({
      gameType: 'GUESS_WHO',
      message: 'Banderas.',
      files: [],
    });

    expect((result.content as Array<Record<string, unknown>>).every((card) => card.imageUrl === null)).toBe(true);
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
