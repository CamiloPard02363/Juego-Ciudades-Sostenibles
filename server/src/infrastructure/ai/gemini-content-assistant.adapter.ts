import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type {
  AiContentAssistant,
  DescribeImageInput,
  GenerateGameDraftInput,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';

// gemini-2.5-flash dejó de estar disponible para keys nuevas (Google
// responde 404 "no longer available to new users" y recomienda este
// modelo en su lugar).
const TEXT_MODEL = 'gemini-3.6-flash';

// El plan gratuito de Google AI Studio limita a pocas llamadas por minuto
// (5 para este modelo al momento de escribir esto). Configurable por si el
// proyecto pasa a un plan de pago con más cuota — ver GOOGLE_IA_STUDIO_MAX_RPM
// en .env.example.
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Único archivo que sabe que el proveedor de IA es Gemini. Si el día de
 * mañana se cambia de proveedor, se escribe una clase nueva que implemente
 * `AiContentAssistant` y se cambia una línea en `game.module.ts` — nada más
 * en el resto de la aplicación depende del SDK de Google.
 */
@Injectable()
export class GeminiContentAssistant implements AiContentAssistant {
  private client: GoogleGenAI | null = null;
  /** Timestamps (epoch ms) de las últimas llamadas a Gemini, para el throttle de abajo. */
  private requestTimestamps: number[] = [];

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

  /**
   * "¿Quién Es?" y "Pares" piden una descripción por cada imagen subida
   * (mínimo 12) más una llamada final para armar el borrador — sin esto,
   * `GenerateGameDraftUseCase` las dispara todas en paralelo con
   * `Promise.all` y se agota la cuota gratuita (5/min) al instante, incluso
   * en el segundo intento (que vuelve a disparar todo junto). Se espacian
   * las llamadas para nunca superar `GOOGLE_IA_STUDIO_MAX_RPM` en cualquier
   * ventana de 60s, en vez de dejar que la API de Google las rechace.
   */
  private async throttle(): Promise<void> {
    const limitRaw = Number(process.env.GOOGLE_IA_STUDIO_MAX_RPM);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_MAX_REQUESTS_PER_MINUTE;

    for (;;) {
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
      );
      if (this.requestTimestamps.length < limit) {
        this.requestTimestamps.push(now);
        return;
      }
      const waitMs = RATE_LIMIT_WINDOW_MS - (now - this.requestTimestamps[0]) + 250;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  async describeImage({ buffer, mimeType }: DescribeImageInput): Promise<string> {
    const client = this.getClient();
    await this.throttle();
    let response;
    try {
      response = await client.models.generateContent({
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
    } catch (error) {
      throw this.wrapProviderError(error);
    }

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

    await this.throttle();
    let response;
    try {
      response = await client.models.generateContent({
        model: TEXT_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' },
      });
    } catch (error) {
      throw this.wrapProviderError(error);
    }

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

  /**
   * Antes, un error del SDK de Google (key inválida, cuota agotada, red)
   * quedaba sin capturar y NestJS lo convertía en un 500 genérico sin
   * mensaje — imposible de diagnosticar desde el cliente o sin acceso a los
   * logs del servidor. Se envuelve en un error HTTP real (que SÍ maneja
   * Nest, a diferencia de un throw crudo) con el motivo original del
   * proveedor, para que se vea tanto en la respuesta como en los logs.
   */
  private wrapProviderError(error: unknown): ServiceUnavailableException {
    const reason = error instanceof Error ? error.message : String(error);
    return new ServiceUnavailableException(
      `El asistente de IA no pudo responder (proveedor): ${reason}`,
    );
  }
}
