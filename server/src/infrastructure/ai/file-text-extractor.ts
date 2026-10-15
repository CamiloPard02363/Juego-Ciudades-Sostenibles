import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_CONTENT_ASSISTANT,
  type AiContentAssistant,
} from '../../domain/ports/ai-content-assistant.port.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { extractPdfText } from './extractors/pdf-text-extractor.js';
import { extractDocxText } from './extractors/docx-text-extractor.js';
import { extractXlsxText, extractCsvText } from './extractors/spreadsheet-text-extractor.js';
import { mapWithConcurrency } from './map-with-concurrency.js';

export interface SourceFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

/** Texto leído de un conjunto de archivos, más los nombres de los que no se pudieron leer. */
export interface TextExtraction {
  /** Texto de los archivos que sí se pudieron leer (vacío si no se leyó ninguno). */
  text: string;
  /** Nombres de archivo que fallaron o no tenían texto (PDF escaneado, imagen sin leer, archivo dañado…). */
  unreadable: string[];
}

export interface ImageDescription {
  description: string;
  /** `false` si la IA no pudo leer la imagen (visión no disponible, límite de uso, archivo dañado). */
  ok: boolean;
}

// Exportado: content-image-extractor.ts lo reusa para decidir qué archivos
// pueden traer imágenes incrustadas, sin duplicar esta lista.
export const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

/**
 * Cada lectura de imagen es una llamada a un modelo con visión, y en el plan
 * gratuito esas llamadas cuentan contra un límite de tokens por minuto: dos a
 * la vez como máximo para no pisarse entre ellas.
 */
const VISION_CONCURRENCY = 2;
/**
 * Tiempo máximo (en total) para leer imágenes con IA en una sola generación.
 * Pasado ese plazo, las que falten se dejan sin leer en vez de hacer esperar al
 * usuario minutos con la petición abierta — el caso de uso las reemplaza por el
 * nombre del archivo y se lo avisa. Configurable con AI_VISION_BUDGET_SECONDS.
 */
const DEFAULT_VISION_BUDGET_SECONDS = 90;

function visionBudgetMs(): number {
  const seconds = Number(process.env.AI_VISION_BUDGET_SECONDS);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_VISION_BUDGET_SECONDS) * 1_000;
}

/**
 * Convierte cada archivo subido en texto plano, sin importar el formato, y
 * los concatena en un único texto fuente para el asistente de IA. Las
 * imágenes no pasan por OCR propio: se delega directamente en la visión del
 * modelo detrás de `AiContentAssistant` (más simple y más barato que montar
 * un pipeline de OCR aparte — ver homeworks del branch).
 */
@Injectable()
export class FileTextExtractor {
  private readonly logger = new Logger(FileTextExtractor.name);

  constructor(
    @Inject(AI_CONTENT_ASSISTANT) private readonly aiContentAssistant: AiContentAssistant,
  ) {}

  async extractAll(files: SourceFile[]): Promise<string> {
    return (await this.extractAllDetailed(files)).text;
  }

  /**
   * Igual que `extractAll`, pero además dice qué archivos no se pudieron
   * leer. Los que fallaron NO aportan ni un encabezado vacío al texto: así
   * "no se leyó nada" se distingue de "se leyó algo".
   */
  async extractAllDetailed(files: SourceFile[]): Promise<TextExtraction> {
    const deadline = Date.now() + visionBudgetMs();
    const results = await mapWithConcurrency(files, VISION_CONCURRENCY, (file) =>
      this.extractOneSafely(file, deadline),
    );

    const readable: string[] = [];
    const unreadable: string[] = [];
    results.forEach((text, index) => {
      if (text.trim()) readable.push(`--- Archivo: ${files[index].filename} ---\n${text.trim()}`);
      else unreadable.push(files[index].filename);
    });
    return { text: readable.join('\n\n'), unreadable };
  }

  /**
   * Describe cada imagen con la visión del modelo, sin tumbar nunca la
   * generación: una imagen que falla (o que queda fuera del plazo) vuelve con
   * `ok: false` y el caso de uso decide cómo seguir. Conserva el orden de
   * `files`.
   */
  async describeImages(files: SourceFile[]): Promise<ImageDescription[]> {
    const deadline = Date.now() + visionBudgetMs();
    return mapWithConcurrency(files, VISION_CONCURRENCY, async (file) => {
      const description = await this.describeOne(file, deadline);
      return { description, ok: description.length > 0 };
    });
  }

  private async describeOne(file: SourceFile, deadline: number): Promise<string> {
    if (Date.now() > deadline) {
      this.logger.warn(`Se omite la lectura de "${file.filename}": se agotó el tiempo para leer imágenes.`);
      return '';
    }
    try {
      return (await this.aiContentAssistant.describeImage({ buffer: file.buffer, mimeType: file.mimeType })).trim();
    } catch (error) {
      this.logger.warn(`No se pudo leer la imagen "${file.filename}": ${errorText(error)}`);
      return '';
    }
  }

  /**
   * Un archivo de un formato soportado (PDF, Word, Excel, imagen…) puede
   * seguir estando corrupto, dañado o con una estructura interna que la
   * librería no sabe leer — issue #208: eso no debe tumbar TODA la
   * generación cuando el usuario subió varios archivos y solo uno falla, así
   * que se degrada a "sin texto de este archivo" en vez de propagar el error
   * crudo de la librería. `InvalidGameContentError` sí se deja pasar tal
   * cual: esa es una validación a propósito (formato no soportado), no una
   * falla de la librería, y merece llegar como error real al usuario.
   */
  private async extractOneSafely(file: SourceFile, deadline: number): Promise<string> {
    if (file.mimeType.startsWith('image/')) {
      return this.describeOne(file, deadline);
    }
    try {
      return await this.extractOne(file);
    } catch (error) {
      if (error instanceof InvalidGameContentError) throw error;
      this.logger.warn(`No se pudo extraer el contenido de "${file.filename}": ${errorText(error)}`);
      return '';
    }
  }

  private async extractOne(file: SourceFile): Promise<string> {
    if (file.mimeType === 'application/pdf') {
      return extractPdfText(file.buffer);
    }
    if (DOCX_MIME_TYPES.has(file.mimeType)) {
      return extractDocxText(file.buffer);
    }
    if (XLSX_MIME_TYPES.has(file.mimeType)) {
      return extractXlsxText(file.buffer);
    }
    if (file.mimeType === 'text/csv') {
      return extractCsvText(file.buffer);
    }

    throw new InvalidGameContentError(
      `el archivo "${file.filename}" tiene un formato no soportado (${file.mimeType}).`,
    );
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
