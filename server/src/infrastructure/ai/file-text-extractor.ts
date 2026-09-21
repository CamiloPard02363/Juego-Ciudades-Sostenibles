import { Inject, Injectable } from '@nestjs/common';
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

const DOCX_MIME_TYPES = new Set([
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
  constructor(
    @Inject(AI_CONTENT_ASSISTANT) private readonly aiContentAssistant: AiContentAssistant,
  ) {}

  async extractAll(files: SourceFile[]): Promise<string> {
    const parts = await Promise.all(files.map((file) => this.extractOne(file)));
    return parts
      .map((text, index) => `--- Archivo: ${files[index].filename} ---\n${text.trim()}`)
      .join('\n\n');
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
