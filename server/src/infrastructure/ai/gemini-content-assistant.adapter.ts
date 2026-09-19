import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type {
  AiContentAssistant,
  DescribeImageInput,
  GenerateGameDraftInput,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';

const TEXT_MODEL = 'gemini-2.5-flash';

/**
 * Único archivo que sabe que el proveedor de IA es Gemini. Si el día de
 * mañana se cambia de proveedor, se escribe una clase nueva que implemente
 * `AiContentAssistant` y se cambia una línea en `game.module.ts` — nada más
 * en el resto de la aplicación depende del SDK de Google.
 */
@Injectable()
export class GeminiContentAssistant implements AiContentAssistant {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GOOGLE_IA_STUDIO_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'El asistente de IA no está configurado todavía.',
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async describeImage({ buffer, mimeType }: DescribeImageInput): Promise<string> {
    const client = this.getClient();
    const response = await client.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Describe en texto plano toda la información legible y relevante de esta imagen (texto, datos, conceptos). No agregues comentarios ni formato, solo la información extraída.',
            },
            { inlineData: { mimeType, data: buffer.toString('base64') } },
          ],
        },
      ],
    });

    return response.text?.trim() ?? '';
  }

  async generateGameDraft({
    gameType,
    sourceText,
    instructions,
    imageDescriptions,
  }: GenerateGameDraftInput): Promise<GenerateGameDraftOutput> {
    const client = this.getClient();
    const imagesSection =
      imageDescriptions && imageDescriptions.length > 0
        ? `\n\nImágenes disponibles (referéncialas por su número, "imageIndex", NUNCA inventes una URL):\n${imageDescriptions
            .map((description, index) => `${index}: ${description || '(sin descripción legible)'}`)
            .join('\n')}`
        : '';

    const prompt = `${instructions}

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta (sin texto adicional, sin markdown):
{ "config": { ... }, "content": [ ... ] }

Texto fuente (extraído de los archivos que subió el usuario para el tema "${gameType}"):
"""
${sourceText.slice(0, 200_000)}
"""${imagesSection}`;

    const response = await client.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const raw = response.text?.trim();
    if (!raw) {
      throw new InvalidGameContentError('la IA no devolvió ningún contenido.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InvalidGameContentError('la IA devolvió una respuesta que no es JSON válido.');
    }

    if (typeof parsed !== 'object' || parsed === null || !('content' in parsed)) {
      throw new InvalidGameContentError('la IA devolvió una respuesta con forma inesperada.');
    }

    const { config, content } = parsed as { config?: unknown; content?: unknown };
    return { config: config ?? {}, content };
  }
}
