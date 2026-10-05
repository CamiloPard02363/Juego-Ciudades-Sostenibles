export const CONTENT_IMAGE_FINDER = Symbol('CONTENT_IMAGE_FINDER');

export interface ImageCandidate {
  /** URL directa de la imagen (miniatura ya redimensionada por la fuente). */
  url: string;
}

export interface FoundImage {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Consigue imágenes para el contenido de un juego cuando el usuario no subió
 * ninguna (issue #240): el asistente de IA genera el tema solo con texto y,
 * para los tipos con imagen obligatoria por elemento (Quién Es, Parejas),
 * cada elemento trae una búsqueda (`imageQuery`) que este puerto resuelve.
 *
 * Separado en dos pasos para que el caso de uso pueda elegir entre varios
 * candidatos y no repetir la misma imagen en dos tarjetas distintas antes de
 * descargar nada.
 */
export interface ContentImageFinder {
  /** Candidatos ordenados de mejor a peor; vacío si no encontró nada (nunca lanza). */
  search(query: string, fallbackQuery?: string): Promise<ImageCandidate[]>;
  /** Descarga un candidato; `null` si falla o no es una imagen válida (nunca lanza). */
  download(candidate: ImageCandidate): Promise<FoundImage | null>;
}
