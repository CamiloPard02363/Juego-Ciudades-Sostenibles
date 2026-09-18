import mammoth from 'mammoth';

/** Extrae el texto plano de un documento Word (.docx) ya cargado en memoria (buffer). */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
