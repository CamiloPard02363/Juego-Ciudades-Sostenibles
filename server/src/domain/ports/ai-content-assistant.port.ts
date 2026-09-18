export const AI_CONTENT_ASSISTANT = Symbol('AI_CONTENT_ASSISTANT');

export interface DescribeImageInput {
  buffer: Buffer;
  mimeType: string;
}

export interface GenerateGameDraftInput {
  gameType: string;
  /** Texto ya extraído (y concatenado) de todos los archivos que subió el usuario. */
  sourceText: string;
  /** Instrucciones + forma de JSON esperada para este gameType (ver game-prompt-catalog). */
  instructions: string;
}

export interface GenerateGameDraftOutput {
  config: unknown;
  content: unknown;
}

/**
 * Puerto hacia el proveedor de IA que arma el borrador de un juego a partir
 * de los archivos que sube el usuario. Ningún caso de uso ni controller
 * conoce el proveedor real (hoy Gemini, ver `infrastructure/ai/`) — cambiarlo
 * es escribir un adaptador nuevo y una línea en el módulo, nada más.
 */
export interface AiContentAssistant {
  /** Describe/extrae en texto legible el contenido de una imagen (usa visión del modelo). */
  describeImage(input: DescribeImageInput): Promise<string>;
  /** Genera `config`/`content` para un `gameType` a partir del texto fuente ya extraído. */
  generateGameDraft(input: GenerateGameDraftInput): Promise<GenerateGameDraftOutput>;
}
