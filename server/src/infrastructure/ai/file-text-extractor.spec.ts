import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiContentAssistant } from '../../domain/ports/ai-content-assistant.port.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { FileTextExtractor, type SourceFile } from './file-text-extractor.js';

function assistantWith(describeImage: AiContentAssistant['describeImage']): AiContentAssistant {
  return { describeImage: vi.fn(describeImage), generateGameDraft: vi.fn() };
}

const csv = (name: string, text: string): SourceFile => ({ buffer: Buffer.from(text), mimeType: 'text/csv', filename: name });
const image = (name: string): SourceFile => ({ buffer: Buffer.from(`img-${name}`), mimeType: 'image/png', filename: name });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('FileTextExtractor.extractAllDetailed', () => {
  it('concatena el texto de cada archivo con su encabezado', async () => {
    const extractor = new FileTextExtractor(assistantWith(async () => 'una bandera'));

    const result = await extractor.extractAllDetailed([csv('a.csv', 'x,y\n1,2'), image('b.png')]);

    expect(result.unreadable).toEqual([]);
    expect(result.text).toContain('--- Archivo: a.csv ---');
    expect(result.text).toContain('--- Archivo: b.png ---\nuna bandera');
  });

  it('un archivo que no se puede leer no aporta ni su encabezado, y se reporta por nombre', async () => {
    const assistant = assistantWith(async () => {
      throw new Error('visión no disponible');
    });
    const extractor = new FileTextExtractor(assistant);

    const result = await extractor.extractAllDetailed([csv('a.csv', 'x,y\n1,2'), image('foto.png')]);

    expect(result.unreadable).toEqual(['foto.png']);
    expect(result.text).toContain('a.csv');
    expect(result.text).not.toContain('foto.png');
  });

  it('si no se lee nada, el texto queda vacío (no solo encabezados) y todos aparecen como ilegibles', async () => {
    const extractor = new FileTextExtractor(
      assistantWith(async () => {
        throw new Error('límite de uso');
      }),
    );

    const result = await extractor.extractAllDetailed([image('a.png'), image('b.png')]);

    expect(result.text).toBe('');
    expect(result.unreadable).toEqual(['a.png', 'b.png']);
  });

  it('una descripción vacía cuenta como ilegible', async () => {
    const extractor = new FileTextExtractor(assistantWith(async () => '   '));

    const result = await extractor.extractAllDetailed([image('a.png')]);

    expect(result).toEqual({ text: '', unreadable: ['a.png'] });
  });

  it('un PDF corrupto se degrada a "sin texto" en vez de tumbar a los demás archivos', async () => {
    const extractor = new FileTextExtractor(assistantWith(async () => 'ok'));
    const corrupt: SourceFile = { buffer: Buffer.from('no soy un pdf'), mimeType: 'application/pdf', filename: 'roto.pdf' };

    const result = await extractor.extractAllDetailed([corrupt, csv('a.csv', 'x,y\n1,2')]);

    expect(result.unreadable).toEqual(['roto.pdf']);
    expect(result.text).toContain('a.csv');
  });

  it('un formato no soportado sí se rechaza con un error claro', async () => {
    const extractor = new FileTextExtractor(assistantWith(async () => 'ok'));
    const weird: SourceFile = { buffer: Buffer.from('x'), mimeType: 'application/zip', filename: 'a.zip' };

    await expect(extractor.extractAllDetailed([weird])).rejects.toBeInstanceOf(InvalidGameContentError);
  });

  it('no lee más de dos imágenes a la vez (límite de tokens por minuto)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const extractor = new FileTextExtractor(
      assistantWith(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return 'descripción';
      }),
    );

    await extractor.extractAllDetailed(Array.from({ length: 8 }, (_, index) => image(`${index}.png`)));

    expect(maxInFlight).toBe(2);
  });

  it('extractAll devuelve solo el texto', async () => {
    const extractor = new FileTextExtractor(assistantWith(async () => 'ok'));

    expect(await extractor.extractAll([csv('a.csv', 'x,y\n1,2')])).toContain('--- Archivo: a.csv ---');
  });
});

describe('FileTextExtractor.describeImages', () => {
  it('conserva el orden y marca cuáles se leyeron', async () => {
    let calls = 0;
    const extractor = new FileTextExtractor(
      assistantWith(async () => {
        calls += 1;
        if (calls === 2) throw new Error('falló la segunda');
        return `descripción ${calls}`;
      }),
    );

    const result = await extractor.describeImages([image('a.png'), image('b.png'), image('c.png')]);

    expect(result.map((item) => item.ok)).toEqual([true, false, true]);
    expect(result[1].description).toBe('');
    expect(result[0].description).toMatch(/^descripción/);
  });

  it('pasado el plazo para leer imágenes, las que faltan se dejan sin leer (no se hace esperar al usuario)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.stubEnv('AI_VISION_BUDGET_SECONDS', '60');
    const assistant = assistantWith(async () => {
      // La primera lectura "tarda" dos minutos de reloj, más que el plazo.
      vi.setSystemTime(new Date('2026-01-01T00:02:00Z'));
      return 'una bandera';
    });
    const extractor = new FileTextExtractor(assistant);

    const result = await extractor.describeImages(Array.from({ length: 5 }, (_, index) => image(`${index}.png`)));

    expect(assistant.describeImage).toHaveBeenCalledTimes(1);
    expect(result.map((item) => item.ok)).toEqual([true, false, false, false, false]);
  });

  it('un AI_VISION_BUDGET_SECONDS inválido vuelve al plazo por defecto', async () => {
    vi.stubEnv('AI_VISION_BUDGET_SECONDS', 'abc');
    const assistant = assistantWith(async () => 'ok');
    const extractor = new FileTextExtractor(assistant);

    await extractor.describeImages([image('a.png'), image('b.png')]);

    expect(assistant.describeImage).toHaveBeenCalledTimes(2);
  });
});
