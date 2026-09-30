import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_CONTENT_ASSISTANT,
  type AiContentAssistant,
} from '../../domain/ports/ai-content-assistant.port.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { extractPdfText } from './extractors/pdf-text-extractor.js';
import { extractDocxText } from './extractors/docx-text-extractor.js';
import { extractXlsxText, extractCsvText } from './extractors/spreadsheet-text-extractor.js';

export interface SourceFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
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
    const parts = await Promise.all(files.map((file) => this.extractOneSafely(file)));
    return parts
      .map((text, index) => `--- Archivo: ${files[index].filename} ---\n${text.trim()}`)
      .join('\n\n');
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
  private async extractOneSafely(file: SourceFile): Promise<string> {
    try {
      return await this.extractOne(file);
    } catch (error) {
      if (error instanceof InvalidGameContentError) throw error;
      this.logger.warn(
        `No se pudo extraer el contenido de "${file.filename}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
    if (file.mimeType.startsWith('image/')) {
      return this.aiContentAssistant.describeImage({ buffer: file.buffer, mimeType: file.mimeType });
    }

    throw new InvalidGameContentError(
      `el archivo "${file.filename}" tiene un formato no soportado (${file.mimeType}).`,
    );
  }
}
