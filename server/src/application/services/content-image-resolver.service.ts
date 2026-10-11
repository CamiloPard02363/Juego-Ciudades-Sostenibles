import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  CONTENT_IMAGE_FINDER,
  type ContentImageFinder,
} from '../../domain/ports/content-image-finder.port.js';
import { IMAGE_STORAGE, type ImageStorage } from '../../domain/ports/image-storage.port.js';
import { mapWithConcurrency } from '../../infrastructure/ai/map-with-concurrency.js';
import { buildIllustrationSvg, findRepeatedGlyphs, illustrationDataUrl } from '../ai/element-illustration.js';

/** Búsquedas/descargas de imágenes en paralelo como máximo (cortesía con la fuente externa). */
const IMAGE_SEARCH_CONCURRENCY = 4;
/** `data:` URL más larga que se acepta como último recurso (el validador de contenido topa en 2048). */
const MAX_INLINE_URL_LENGTH = 1800;

export type ImageSource = 'wikimedia' | 'ai';

/** Un elemento del juego (tarjeta, pareja…) que necesita una imagen. */
export interface ImageNeed {
  /** Nombre del elemento tal cual lo verá el jugador. */
  label: string;
  /** Búsqueda en inglés para Wikimedia; `null` si el modelo no mandó ninguna ni hay label. */
  query: string | null;
  /** Emoji que eligió la IA para la ilustración de respaldo. */
  emoji?: string | null;
  /** Color base que eligió la IA para la ilustración de respaldo. */
  color?: string | null;
}

export interface ResolvedImage {
  url: string;
  source: ImageSource;
}

export interface ImageResolution {
  /** Una entrada por `ImageNeed`, en el mismo orden; `null` si no hubo forma de conseguirla. */
  images: Array<ResolvedImage | null>;
  counts: { wikimedia: number; ai: number; missing: number };
}

const DEFAULT_SOURCES: readonly ImageSource[] = ['wikimedia', 'ai'];

/** Lee AI_CONTENT_IMAGE_SOURCES (ej. "wikimedia,ai" o solo "ai"), ignorando nombres desconocidos. */
function configuredSources(): readonly ImageSource[] {
  const parsed = (process.env.AI_CONTENT_IMAGE_SOURCES ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name): name is ImageSource => name === 'wikimedia' || name === 'ai');
  return parsed.length > 0 ? [...new Set(parsed)] : DEFAULT_SOURCES;
}

/**
 * Consigue UNA imagen por elemento cuando el usuario no subió las suyas
 * (issues #240 y #21). Para cada elemento prueba, en este orden (configurable
 * con AI_CONTENT_IMAGE_SOURCES):
 *
 * 1. `wikimedia`: una foto libre de Wikipedia/Wikimedia Commons (ver
 *    `ContentImageFinder`), subida al almacenamiento de imágenes.
 * 2. `ai`: una ilustración básica creada a partir del emoji y el color que
 *    eligió la IA (ver `element-illustration.ts`). Siempre se puede armar: si
 *    el almacenamiento no está disponible, va embebida en la propia URL.
 *
 * Nunca lanza: cualquier fallo (red, almacenamiento, descarga) deja ese
 * elemento en `null` o cae a la siguiente fuente, y el borrador se genera
 * igual. Tampoco repite la misma foto en dos elementos.
 */
@Injectable()
export class ContentImageResolver {
  private readonly logger = new Logger(ContentImageResolver.name);

  constructor(
    @Inject(CONTENT_IMAGE_FINDER) private readonly contentImageFinder: ContentImageFinder,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
  ) {}

  async resolve(needs: ImageNeed[], folder: string): Promise<ImageResolution> {
    const sources = configuredSources();
    const reserved = new Set<string>();
    const storage = { available: true };
    // Dos elementos con el mismo emoji (o iniciales) se verían idénticos: el
    // segundo lleva la inicial de su concepto en una esquina para distinguirlo.
    const repeated = findRepeatedGlyphs(needs);

    const images = await mapWithConcurrency(needs, IMAGE_SEARCH_CONCURRENCY, async (need, index): Promise<ResolvedImage | null> => {
      for (const source of sources) {
        const url =
          source === 'wikimedia'
            ? await this.fromWikimedia(need, folder, reserved, storage)
            : await this.fromIllustration(need, repeated[index], folder, storage);
        if (url) return { url, source };
      }
      return null;
    });

    const wikimedia = images.filter((image) => image?.source === 'wikimedia').length;
    const ai = images.filter((image) => image?.source === 'ai').length;
    return { images, counts: { wikimedia, ai, missing: images.length - wikimedia - ai } };
  }

  /**
   * Cada candidato se reserva de forma síncrona antes de descargarlo, así dos
   * búsquedas en paralelo no pueden quedarse con la misma foto.
   */
  private async fromWikimedia(
    need: ImageNeed,
    folder: string,
    reserved: Set<string>,
    storage: { available: boolean },
  ): Promise<string | null> {
    if (!need.query || !storage.available) return null;
    try {
      const candidates = await this.contentImageFinder.search(need.query, need.label);
      for (const candidate of candidates) {
        const key = candidate.url.split('?')[0];
        if (reserved.has(key)) continue;
        reserved.add(key);
        const image = await this.contentImageFinder.download(candidate);
        if (!image) continue;
        const uploaded = await this.uploadSafely(image.buffer, folder, storage);
        // Sin almacenamiento no tiene sentido seguir probando candidatos.
        return uploaded;
      }
    } catch (error) {
      this.logger.warn(`Falló la búsqueda de imagen para "${need.label}": ${errorText(error)}`);
    }
    return null;
  }

  private async fromIllustration(
    need: ImageNeed,
    badge: boolean,
    folder: string,
    storage: { available: boolean },
  ): Promise<string | null> {
    try {
      const input = { label: need.label, emoji: need.emoji, color: need.color, badge };
      if (storage.available) {
        const uploaded = await this.uploadSafely(buildIllustrationSvg(input), folder, storage);
        if (uploaded) return uploaded;
      }
      // Último recurso: la ilustración es tan chica que cabe en la propia URL.
      const inline = illustrationDataUrl(input);
      return inline.length <= MAX_INLINE_URL_LENGTH ? inline : null;
    } catch (error) {
      this.logger.warn(`No se pudo crear la ilustración de "${need.label}": ${errorText(error)}`);
      return null;
    }
  }

  /** Sube un buffer; `null` si falla. Un almacenamiento sin configurar se recuerda para no insistir con los demás. */
  private async uploadSafely(
    buffer: Buffer,
    folder: string,
    storage: { available: boolean },
  ): Promise<string | null> {
    try {
      return (await this.imageStorage.upload(buffer, folder)).url;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) storage.available = false;
      this.logger.warn(`No se pudo subir la imagen: ${errorText(error)}`);
      return null;
    }
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Aviso para el usuario sobre de dónde salió cada imagen del borrador. */
export function describeImageResolution(counts: ImageResolution['counts'], total: number): string {
  const { wikimedia, ai, missing } = counts;
  const missingText = missing > 0 ? ` Agrega a mano la imagen de las ${missing} que faltan.` : '';

  if (wikimedia === 0 && ai === 0) {
    return 'La IA armó el contenido, pero no pudo conseguir imágenes — agrega la imagen de cada elemento a mano.';
  }
  if (ai === 0) {
    return missing === 0
      ? `La IA consiguió las ${wikimedia} imágenes en Wikimedia Commons — revisa que cada una corresponda.`
      : `La IA consiguió ${wikimedia} de ${total} imágenes en Wikimedia Commons — revisa que correspondan.${missingText}`;
  }
  if (wikimedia === 0) {
    return `No subiste imágenes, así que la IA creó una ilustración básica para ${missing === 0 ? `las ${ai}` : `${ai} de las ${total}`} tarjetas — puedes reemplazarlas por las tuyas.${missingText}`;
  }
  return `La IA consiguió ${wikimedia} fotos en Wikimedia Commons y creó ${ai} ilustraciones básicas — revisa que correspondan y reemplaza las que quieras.${missingText}`;
}
