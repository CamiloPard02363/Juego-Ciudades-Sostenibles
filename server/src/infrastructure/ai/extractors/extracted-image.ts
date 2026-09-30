/** Imagen cruda extraída de dentro de otro archivo (PDF, Word) — ver content-image-extractor.ts. */
export interface ExtractedImage {
  buffer: Buffer;
  mimeType: string;
}
