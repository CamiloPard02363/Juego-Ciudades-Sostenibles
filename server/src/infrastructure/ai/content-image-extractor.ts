import { Logger } from '@nestjs/common';
import type { SourceFile } from './file-text-extractor.js';
import { DOCX_MIME_TYPES } from './file-text-extractor.js';
import { extractPdfImages } from './extractors/pdf-image-extractor.js';
import { extractDocxImages } from './extractors/docx-image-extractor.js';

const logger = new Logger('ContentImageExtractor');

/**
 * Una imagen incrustada dentro de otro archivo, ya lista para tratarse como
 * si el usuario la hubiera subido suelta — `filename` sirve solo para
 * trazabilidad (logs, mensajes de error), nunca se le muestra al modelo.
 */
export interface ExtractedContentImage {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

/**
 * Extrae las imágenes incrustadas de un archivo (PDF o Word) para los tipos
 * de juego con imagen obligatoria por elemento (Quién Es, Parejas) — issue
 * #208: un PDF o Word con varias fotos adentro cuenta como una sola carga,
 * sin que el usuario tenga que separar cada imagen a mano primero.
 *
 * Cualquier archivo que no sea PDF ni Word (Excel, CSV) devuelve un arreglo
 * vacío sin intentar nada — sigue yendo por el camino de texto de siempre
 * (`FileTextExtractor`).
 *
 * Nunca lanza: un PDF/Word corrupto o con una estructura que la librería no
 * sabe leer simplemente no aporta imágenes (arreglo vacío) en vez de tumbar
 * el resto de la generación — el usuario ya subió otros archivos que sí
 * pueden ser válidos, y el archivo original sigue intentando aportar texto
 * por separado (ver `FileTextExtractor`, que corre aparte).
 */
export async function extractEmbeddedImages(file: SourceFile): Promise<ExtractedContentImage[]> {
  try {
    let images: Array<{ buffer: Buffer; mimeType: string }> = [];

    if (file.mimeType === 'application/pdf') {
      images = await extractPdfImages(file.buffer);
    } else if (DOCX_MIME_TYPES.has(file.mimeType)) {
      images = await extractDocxImages(file.buffer);
    } else {
      return [];
    }

    return images.map((image, index) => ({
      buffer: image.buffer,
      mimeType: image.mimeType,
      filename: `${file.filename} (imagen ${index + 1})`,
    }));
  } catch (error) {
    logger.warn(
      `No se pudieron extraer imágenes incrustadas de "${file.filename}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}
