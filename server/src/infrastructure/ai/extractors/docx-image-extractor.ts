import mammoth from 'mammoth';
import type { ExtractedImage } from './extracted-image.js';

/**
 * Extrae las imágenes incrustadas en un documento Word (.docx) — mismo
 * criterio que `extractPdfImages` (issue #208): un profesor que pega sus
 * fotos dentro de un Word en vez de subir archivos de imagen sueltos no
 * debería perder esas imágenes.
 */
export async function extractDocxImages(buffer: Buffer): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];

  await mammoth.convertToHtml(
    { buffer },
    {
      // mammoth exige que el conversor devuelva un `src` para el <img> del
      // HTML de salida, aunque ese HTML no se use para nada acá — solo nos
      // interesa el efecto secundario de recolectar cada imagen.
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.readAsBuffer();
        images.push({ buffer: imageBuffer, mimeType: image.contentType });
        return { src: '' };
      }),
    },
  );

  return images;
}
