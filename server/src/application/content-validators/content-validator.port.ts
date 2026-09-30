export interface ContentValidationOptions {
  /**
   * true cuando el contenido viene de `GenerateGameDraftUseCase` (issue
   * #208): un borrador de IA que el usuario todavía va a revisar/completar
   * a mano en el formulario normal, no el contenido final de un juego ya
   * creado. La mayoría de validadores lo ignoran (su validación no depende
   * de si es borrador); un validador que sí quiera relajar un mínimo de
   * cantidad SOLO para el borrador (ej. GuessWhoContentValidator: la AI
   * genera una tarjeta por imagen, y el usuario puede haber subido menos de
   * las recomendadas a propósito, para completar el resto después) lo lee
   * acá. La cantidad final SIEMPRE se revalida sin este flag al crear/editar
   * el juego de verdad (`GameFactoryService`/`UpdateGameUseCase`).
   */
  isDraft?: boolean;
}

/**
 * Cada `gameType` trae su propio validador de forma para `config`/`content`.
 * Vive en application (no en domain) porque conocer el shape exacto de cada
 * tipo de juego no es una invariante del agregado `Game` — es una regla de
 * la aplicación sobre qué datos acepta cada modalidad.
 */
export interface ContentValidator {
  validateConfig(config: unknown): Record<string, unknown>;
  /** `config` recibe el resultado ya validado de `validateConfig` — algunos tipos de juego necesitan conocerlo para validar la forma del contenido (ej. el `mode` de MEMORY_MATCH). */
  validateContent(
    content: unknown,
    config?: Record<string, unknown>,
    options?: ContentValidationOptions,
  ): unknown[];
}
