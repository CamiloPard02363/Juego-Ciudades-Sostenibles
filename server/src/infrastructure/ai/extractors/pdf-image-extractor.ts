import { PDFParse } from 'pdf-parse';
import type { ExtractedImage } from './extracted-image.js';

/**
 * Extrae las imágenes incrustadas en un PDF (una foto por página, o varias
 * por página) — issue #208: un profesor que exporta o escanea sus fotos como
 * un solo PDF no debería tener que separarlas a mano en archivos de imagen
 * sueltos, la IA las detecta igual. Usa el `imageThreshold` por defecto de
 * pdf-parse (80px de ancho o alto) para ignorar imágenes decorativas chicas
 * (viñetas, logos de encabezado) que no son contenido real del juego.
 *
 * No se pide `imageDataUrl` (solo `imageBuffer`): el consumidor de esta
 * función solo necesita los bytes crudos, pedir también el data URL sería
 * trabajo (base64) que nadie usa.
 */
export async function extractPdfImages(buffer: Buffer): Promise<ExtractedImage[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getImage({ imageBuffer: true, imageDataUrl: false });
    return result.pages.flatMap((page) =>
      page.images.map((image) => ({
        buffer: Buffer.from(image.data),
        // pdf-parse siempre re-codifica a PNG al extraer (usa canvas por
        // debajo), sin importar el formato original embebido en el PDF.
        mimeType: 'image/png',
      })),
    );
  } finally {
    await parser.destroy();
  }
}
