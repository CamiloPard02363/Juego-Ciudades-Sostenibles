import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import type { ContentImageFinder, ImageCandidate } from '../../domain/ports/content-image-finder.port.js';
import type { ImageStorage, UploadedImage } from '../../domain/ports/image-storage.port.js';
import {
  ContentImageResolver,
  describeImageResolution,
  type ImageNeed,
} from './content-image-resolver.service.js';

function fakeStorage(): ImageStorage {
  let counter = 0;
  return {
    upload: vi.fn().mockImplementation(async (): Promise<UploadedImage> => {
      const id = counter++;
      return { url: `https://cdn.test/${id}`, publicId: `${id}` };
    }),
    uploadAudio: vi.fn(),
  };
}

function fakeFinder(results: Record<string, string[]> = {}): ContentImageFinder {
  return {
    search: vi.fn().mockImplementation(async (query: string): Promise<ImageCandidate[]> =>
      (results[query] ?? []).map((url) => ({ url })),
    ),
    download: vi.fn().mockImplementation(async (candidate: ImageCandidate) =>
      candidate.url.includes('broken') ? null : { buffer: Buffer.from(`photo:${candidate.url}`), mimeType: 'image/jpeg' },
    ),
  };
}

const need = (label: string, extra: Partial<ImageNeed> = {}): ImageNeed => ({ label, query: label, emoji: '🧊', color: '#bae6fd', ...extra });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ContentImageResolver', () => {
  it('usa la foto de Wikimedia cuando existe, y la sube al almacenamiento', async () => {
    const storage = fakeStorage();
    const resolver = new ContentImageResolver(fakeFinder({ Cubo: ['https://img.test/cubo.jpg'] }), storage);

    const { images, counts } = await resolver.resolve([need('Cubo')], 'memory-cards');

    expect(images).toEqual([{ url: 'https://cdn.test/0', source: 'wikimedia' }]);
    expect(counts).toEqual({ wikimedia: 1, ai: 0, missing: 0 });
    expect(storage.upload).toHaveBeenCalledWith(Buffer.from('photo:https://img.test/cubo.jpg'), 'memory-cards');
  });

  it('cuando no hay foto, crea la ilustración con el emoji y el color de la IA', async () => {
    const storage = fakeStorage();
    const resolver = new ContentImageResolver(fakeFinder(), storage);

    const { images, counts } = await resolver.resolve([need('Cubo', { emoji: '🧊', color: '#bae6fd' })], 'memory-cards');

    expect(images).toEqual([{ url: 'https://cdn.test/0', source: 'ai' }]);
    expect(counts).toEqual({ wikimedia: 0, ai: 1, missing: 0 });
    const svg = vi.mocked(storage.upload).mock.calls[0][0].toString();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('🧊');
  });

  it('mezcla fotos e ilustraciones y respeta el orden de los elementos', async () => {
    const resolver = new ContentImageResolver(fakeFinder({ B: ['https://img.test/b.jpg'] }), fakeStorage());

    const { images, counts } = await resolver.resolve([need('A'), need('B'), need('C')], 'f');

    expect(images.map((image) => image?.source)).toEqual(['ai', 'wikimedia', 'ai']);
    expect(counts).toEqual({ wikimedia: 1, ai: 2, missing: 0 });
  });

  it('dos elementos con el mismo emoji no quedan idénticos: el repetido lleva la inicial de su concepto', async () => {
    const storage = fakeStorage();
    const resolver = new ContentImageResolver(fakeFinder(), storage);

    await resolver.resolve(
      [need('Triángulo', { emoji: '🔺' }), need('Cubo', { emoji: '🧊' }), need('Pirámide', { emoji: '🔺' })],
      'f',
    );

    const svgs = vi.mocked(storage.upload).mock.calls.map(([buffer]) => buffer.toString());
    const bySymbol = (emoji: string) => svgs.filter((svg) => svg.includes(emoji));
    expect(bySymbol('🔺')).toHaveLength(2);
    // Exactamente uno de los dos 🔺 lleva insignia (y es el segundo en aparecer en la lista).
    expect(bySymbol('🔺').filter((svg) => svg.includes('cx="82"'))).toHaveLength(1);
    expect(bySymbol('🧊')[0]).not.toContain('cx="82"');
    expect(new Set(svgs).size).toBe(3);
  });

  it('un elemento sin búsqueda ni etiqueta salta Wikimedia y va directo a la ilustración', async () => {
    const finder = fakeFinder();
    const resolver = new ContentImageResolver(finder, fakeStorage());

    const { images } = await resolver.resolve([need('', { query: null })], 'f');

    expect(finder.search).not.toHaveBeenCalled();
    expect(images[0]?.source).toBe('ai');
  });

  it('nunca asigna la misma foto a dos elementos: pasa al siguiente candidato', async () => {
    const finder = fakeFinder({
      A: ['https://img.test/shared.jpg'],
      B: ['https://img.test/shared.jpg?v=2', 'https://img.test/otra.jpg'],
    });
    const resolver = new ContentImageResolver(finder, fakeStorage());

    const { images } = await resolver.resolve([need('A'), need('B')], 'f');

    expect(images.map((image) => image?.source)).toEqual(['wikimedia', 'wikimedia']);
    const downloaded = vi.mocked(finder.download).mock.calls.map(([candidate]) => candidate.url);
    expect(downloaded).toEqual(['https://img.test/shared.jpg', 'https://img.test/otra.jpg']);
  });

  it('si la foto no se puede descargar prueba otra; si ninguna sirve, cae a la ilustración', async () => {
    const resolver = new ContentImageResolver(
      fakeFinder({ A: ['https://img.test/broken-1.jpg', 'https://img.test/ok.jpg'], B: ['https://img.test/broken-2.jpg'] }),
      fakeStorage(),
    );

    const { images } = await resolver.resolve([need('A'), need('B')], 'f');

    expect(images.map((image) => image?.source)).toEqual(['wikimedia', 'ai']);
  });

  it('si la búsqueda en Wikimedia lanza un error, ese elemento cae a la ilustración y los demás siguen', async () => {
    const finder = fakeFinder({ B: ['https://img.test/b.jpg'] });
    vi.mocked(finder.search).mockImplementationOnce(async () => {
      throw new Error('Wikimedia caído');
    });
    const resolver = new ContentImageResolver(finder, fakeStorage());

    const { images } = await resolver.resolve([need('A'), need('B')], 'f');

    expect(images[0]?.source).toBe('ai');
    expect(images[1]?.source).toBe('wikimedia');
  });

  it('si el almacenamiento no está configurado, la ilustración va embebida y no se insiste con las demás subidas', async () => {
    const storage = fakeStorage();
    vi.mocked(storage.upload).mockRejectedValue(new ServiceUnavailableException('sin Cloudinary'));
    const resolver = new ContentImageResolver(fakeFinder({ A: ['https://img.test/a.jpg'] }), storage);

    const { images, counts } = await resolver.resolve(
      [need('A'), need('B'), need('C'), need('D'), need('E'), need('F')],
      'f',
    );

    expect(images.every((image) => image?.url.startsWith('data:image/svg+xml;base64,'))).toBe(true);
    expect(counts).toEqual({ wikimedia: 0, ai: 6, missing: 0 });
    // Con concurrencia 4 hay como mucho 4 intentos en vuelo antes de enterarse.
    expect(vi.mocked(storage.upload).mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('un error de subida pasajero afecta solo a ese elemento', async () => {
    const storage = fakeStorage();
    const ok = vi.mocked(storage.upload).getMockImplementation()!;
    vi.mocked(storage.upload).mockImplementation(async (buffer, folder) => {
      if (buffer.toString().includes('🦊')) throw new Error('timeout');
      return ok(buffer, folder);
    });
    const resolver = new ContentImageResolver(fakeFinder(), storage);

    const { images } = await resolver.resolve([need('Zorro', { emoji: '🦊' }), need('Cubo')], 'f');

    expect(images[0]?.url.startsWith('data:image/svg+xml')).toBe(true);
    expect(images[1]?.url).toMatch(/^https:\/\/cdn\.test\//);
  });

  it('con una lista vacía no hace nada', async () => {
    const storage = fakeStorage();
    const resolver = new ContentImageResolver(fakeFinder(), storage);

    expect(await resolver.resolve([], 'f')).toEqual({ images: [], counts: { wikimedia: 0, ai: 0, missing: 0 } });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  describe('AI_CONTENT_IMAGE_SOURCES', () => {
    it('"wikimedia" deja en null lo que no se encontró', async () => {
      vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', 'wikimedia');
      const resolver = new ContentImageResolver(fakeFinder({ A: ['https://img.test/a.jpg'] }), fakeStorage());

      const { images, counts } = await resolver.resolve([need('A'), need('B')], 'f');

      expect(images[1]).toBeNull();
      expect(counts).toEqual({ wikimedia: 1, ai: 0, missing: 1 });
    });

    it('"ai" no consulta Wikimedia', async () => {
      vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', 'ai');
      const finder = fakeFinder({ A: ['https://img.test/a.jpg'] });
      const resolver = new ContentImageResolver(finder, fakeStorage());

      const { counts } = await resolver.resolve([need('A')], 'f');

      expect(finder.search).not.toHaveBeenCalled();
      expect(counts).toEqual({ wikimedia: 0, ai: 1, missing: 0 });
    });

    it('"ai,wikimedia" invierte el orden', async () => {
      vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', 'ai,wikimedia');
      const finder = fakeFinder({ A: ['https://img.test/a.jpg'] });
      const resolver = new ContentImageResolver(finder, fakeStorage());

      const { images } = await resolver.resolve([need('A')], 'f');

      expect(images[0]?.source).toBe('ai');
      expect(finder.search).not.toHaveBeenCalled();
    });

    it.each(['', '  ', 'otra,cosa', 'google'])('un valor vacío o desconocido (%j) vuelve al orden por defecto', async (value) => {
      vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', value);
      const resolver = new ContentImageResolver(fakeFinder({ A: ['https://img.test/a.jpg'] }), fakeStorage());

      const { images } = await resolver.resolve([need('A'), need('B')], 'f');

      expect(images.map((image) => image?.source)).toEqual(['wikimedia', 'ai']);
    });

    it('ignora mayúsculas, espacios y repetidos', async () => {
      vi.stubEnv('AI_CONTENT_IMAGE_SOURCES', ' AI , ai ,Wikimedia');
      const resolver = new ContentImageResolver(fakeFinder(), fakeStorage());

      const { counts } = await resolver.resolve([need('A')], 'f');

      expect(counts.ai).toBe(1);
    });
  });
});

describe('describeImageResolution', () => {
  it('todo de Wikimedia', () => {
    expect(describeImageResolution({ wikimedia: 12, ai: 0, missing: 0 }, 12)).toBe(
      'La IA consiguió las 12 imágenes en Wikimedia Commons — revisa que cada una corresponda.',
    );
  });

  it('parte de Wikimedia, parte faltante', () => {
    expect(describeImageResolution({ wikimedia: 8, ai: 0, missing: 4 }, 12)).toMatch(
      /8 de 12 imágenes en Wikimedia Commons.*Agrega a mano la imagen de las 4 que faltan/,
    );
  });

  it('todo ilustraciones de la IA', () => {
    expect(describeImageResolution({ wikimedia: 0, ai: 12, missing: 0 }, 12)).toMatch(
      /No subiste imágenes, así que la IA creó una ilustración básica para las 12 tarjetas/,
    );
  });

  it('mezcla de ambas', () => {
    expect(describeImageResolution({ wikimedia: 5, ai: 7, missing: 0 }, 12)).toMatch(
      /5 fotos en Wikimedia Commons y creó 7 ilustraciones básicas/,
    );
  });

  it('ilustraciones con faltantes', () => {
    const text = describeImageResolution({ wikimedia: 0, ai: 10, missing: 2 }, 12);
    expect(text).toMatch(/10 de las 12 tarjetas/);
    expect(text).toMatch(/Agrega a mano la imagen de las 2 que faltan/);
  });

  it('ninguna imagen', () => {
    expect(describeImageResolution({ wikimedia: 0, ai: 0, missing: 12 }, 12)).toMatch(/no pudo conseguir imágenes/);
  });
});
