import { Injectable, Logger } from '@nestjs/common';
import type {
  ContentImageFinder,
  FoundImage,
  ImageCandidate,
} from '../../domain/ports/content-image-finder.port.js';

// La política de Wikimedia exige un User-Agent que identifique la app y
// cómo contactarla; configurable por WIKIMEDIA_USER_AGENT (ver .env.example).
const DEFAULT_USER_AGENT =
  'NexusPlay/1.0 (plataforma educativa; https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles)';
const THUMB_WIDTH = 640;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

type WikipediaSearchResponse = {
  query?: { pages?: Array<{ index?: number; thumbnail?: { source?: string } }> };
};

type CommonsSearchResponse = {
  query?: {
    pages?: Array<{ index?: number; imageinfo?: Array<{ thumburl?: string; mime?: string }> }>;
  };
};

/**
 * Busca imágenes reales y de licencia libre en Wikipedia/Wikimedia Commons
 * (issue #240) — gratis, sin API key y con fotos educativas adecuadas para
 * "¿Quién Es?"/Parejas (banderas, animales, lugares, personajes,
 * figuras…). Orden de búsqueda:
 *
 * 1. Imagen principal de los artículos de Wikipedia en inglés que coinciden
 *    con `query` (el modelo la escribe en inglés: es la Wikipedia con más
 *    artículos ilustrados).
 * 2. Archivos de Commons que coinciden con `query` (solo mapas de bits, sin
 *    SVG/PDF/audio).
 * 3. Si nada de eso dio resultado: Wikipedia en español con `fallbackQuery`
 *    (el label tal cual lo verá el jugador).
 *
 * Nunca lanza: cualquier error de red o respuesta rara se registra y se
 * trata como "sin resultados", para que el borrador se genere igual y el
 * usuario complete a mano las imágenes que falten.
 */
@Injectable()
export class WikimediaContentImageFinder implements ContentImageFinder {
  private readonly logger = new Logger(WikimediaContentImageFinder.name);
  private readonly userAgent = process.env.WIKIMEDIA_USER_AGENT?.trim() || DEFAULT_USER_AGENT;

  async search(query: string, fallbackQuery?: string): Promise<ImageCandidate[]> {
    const trimmed = query.trim();
    const [wikipedia, commons] = trimmed
      ? await Promise.all([this.searchWikipedia('en', trimmed), this.searchCommons(trimmed)])
      : [[], []];
    const candidates = [...wikipedia.slice(0, 2), ...commons.slice(0, 3)];
    if (candidates.length > 0 || !fallbackQuery?.trim()) return dedupe(candidates);
    return dedupe(await this.searchWikipedia('es', fallbackQuery.trim()));
  }

  async download(candidate: ImageCandidate): Promise<FoundImage | null> {
    try {
      const response = await fetch(candidate.url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const mimeType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (!ACCEPTED_MIME_TYPES.has(mimeType)) return null;
      const length = Number(response.headers.get('content-length') ?? 0);
      if (length > MAX_IMAGE_BYTES) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
      return { buffer, mimeType };
    } catch (error) {
      this.logger.warn(`No se pudo descargar ${candidate.url}: ${describeError(error)}`);
      return null;
    }
  }

  private async searchWikipedia(lang: 'en' | 'es', query: string): Promise<ImageCandidate[]> {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrlimit: '3',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: String(THUMB_WIDTH),
      format: 'json',
      formatversion: '2',
    });
    const data = await this.getJson<WikipediaSearchResponse>(`https://${lang}.wikipedia.org/w/api.php?${params}`);
    return sortByIndex(data?.query?.pages ?? [])
      .map((page) => page.thumbnail?.source)
      .filter(isRasterUrl)
      .map((url) => ({ url }));
  }

  private async searchCommons(query: string): Promise<ImageCandidate[]> {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: `${query} filetype:bitmap`,
      gsrlimit: '5',
      prop: 'imageinfo',
      iiprop: 'url|mime',
      iiurlwidth: String(THUMB_WIDTH),
      format: 'json',
      formatversion: '2',
    });
    const data = await this.getJson<CommonsSearchResponse>(`https://commons.wikimedia.org/w/api.php?${params}`);
    return sortByIndex(data?.query?.pages ?? [])
      .map((page) => page.imageinfo?.[0])
      .filter((info) => info?.mime && ACCEPTED_MIME_TYPES.has(info.mime))
      .map((info) => info?.thumburl)
      .filter(isRasterUrl)
      .map((url) => ({ url }));
  }

  private async getJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Wikimedia respondió ${response.status} para ${url}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`Falló la búsqueda en Wikimedia (${url}): ${describeError(error)}`);
      return null;
    }
  }
}

function sortByIndex<T extends { index?: number }>(pages: T[]): T[] {
  return [...pages].sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER));
}

/** Descarta SVG/PDF/vídeo sueltos: solo miniaturas raster que Cloudinary y el juego muestran sin problema. */
function isRasterUrl(url: string | undefined): url is string {
  if (!url) return false;
  const path = url.split('?')[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(path);
}

function dedupe(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
