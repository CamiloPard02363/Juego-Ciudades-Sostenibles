import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type {
  AiContentAssistant,
  DescribeImageInput,
  GenerateGameDraftInput,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';
import { RateLimiter } from './rate-limiter.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Modelo de texto disponible en el free tier de Groq (issue #204, fallback
// cuando Gemini agota cuota). Groq no expone hoy ningún modelo con visión
// para keys nuevas del free tier (se probó con la key real del proyecto:
// 404 "model_not_found" en los que sí anuncian visión) — por eso
// `describeImage` acá solo funciona si el día de mañana la cuenta consigue
// acceso a uno con visión (cambiando GROQ_MODEL, sin tocar código). Mientras
// tanto, este proveedor sigue siendo un respaldo real para
// `generateGameDraft` en su forma de solo texto, que es la mayoría de los
// tipos de juego (todos salvo "¿Quién Es?"/"Pares", que además mandan
// `imageDescriptions` ya en texto). Configurable por si Groq lo retira o
// sale uno mejor — ver GROQ_MODEL en .env.example.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

// El free tier de Groq es más generoso que el de Google AI Studio, pero
// sigue teniendo límite por minuto — mismo criterio de throttle que Gemini
// (ver rate-limiter.ts), configurable por GROQ_MAX_RPM.
const DEFAULT_MAX_REQUESTS_PER_MINUTE = 25;

type GroqChatMessage = {
  role: 'user';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};

/**
 * Segundo proveedor de la cadena de fallback (ver `AiProviderOrchestrator`).
 * Igual que `GeminiContentAssistant`, es el único archivo que sabe que este
 * proveedor es Groq — implementa el mismo puerto `AiContentAssistant`, así
 * que agregar un tercer proveedor el día de mañana es escribir una clase
 * nueva igual a esta y una línea en `game.module.ts`, nada más.
 */
@Injectable()
export class GroqContentAssistant implements AiContentAssistant {
  private readonly rateLimiter = new RateLimiter('GROQ_MAX_RPM', DEFAULT_MAX_REQUESTS_PER_MINUTE);

  private getApiKey(): string {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('El proveedor de respaldo de IA (Groq) no está configurado todavía.');
    }
    return apiKey;
  }

  private getModel(): string {
    return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  }

  private async chatCompletion(
    messages: GroqChatMessage[],
    options: { jsonMode?: boolean } = {},
  ): Promise<string> {
    const apiKey = this.getApiKey();
    await this.rateLimiter.throttle();

    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.getModel(),
          messages,
          ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
    } catch (error) {
      throw this.wrapProviderError(error);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw this.wrapProviderError(new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`));
    }

    let payload: { choices?: Array<{ message?: { content?: string } }> };
    try {
      payload = await response.json();
    } catch (error) {
      throw this.wrapProviderError(error);
    }

    return payload.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async describeImage({ buffer, mimeType }: DescribeImageInput): Promise<string> {
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const text = await this.chatCompletion([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe en texto plano toda la información legible y relevante de esta imagen (texto, datos, conceptos). No agregues comentarios ni formato, solo la información extraída.',
          },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ]);

    return text;
  }

  async generateGameDraft({
    gameType,
    sourceText,
    instructions,
    imageDescriptions,
  }: GenerateGameDraftInput): Promise<GenerateGameDraftOutput> {
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

    const raw = await this.chatCompletion([{ role: 'user', content: prompt }], { jsonMode: true });
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

  /** Mismo criterio que `GeminiContentAssistant.wrapProviderError`: nunca dejar pasar un error crudo del proveedor. */
  private wrapProviderError(error: unknown): ServiceUnavailableException {
    const reason = error instanceof Error ? error.message : String(error);
    return new ServiceUnavailableException(`El asistente de IA no pudo responder (proveedor): ${reason}`);
  }
}
