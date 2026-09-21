import { PDFParse } from 'pdf-parse';

/** Extrae el texto plano de un PDF ya cargado en memoria (buffer). */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
