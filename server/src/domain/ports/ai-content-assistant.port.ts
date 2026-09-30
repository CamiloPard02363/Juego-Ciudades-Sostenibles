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
  /**
   * Descripciones (por visión del modelo) de las imágenes que el usuario
   * subió como CONTENIDO del juego (no como material de referencia) — solo
   * presente en tipos de juego con imagen obligatoria por elemento (Quién
   * Es, Parejas). El índice de este arreglo es el "imageIndex" que la IA
   * debe usar para referenciar cada imagen en el JSON generado, en vez de
   * inventar una URL.
   */
  imageDescriptions?: string[];
}

export interface GenerateGameDraftOutput {
  config: unknown;
  content: unknown;
  /**
   * Título/descripción que la IA sugiere para el formulario de creación
   * (issue #210, "Pares"/MEMORY_MATCH) — solo presente cuando el `spec` del
   * tipo de juego se lo pide en sus `instructions` (ver game-prompt-catalog).
   * `undefined` cuando el modelo no los devolvió o el tipo de juego no los
   * pide; nunca reemplaza lo que el usuario ya haya escrito a mano en el
   * formulario sin que él lo acepte explícitamente al aplicar el borrador.
   */
  suggestedTitle?: string;
  suggestedDescription?: string;
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
