/**
 * Cada `gameType` trae su propio validador de forma para `config`/`content`.
 * Vive en application (no en domain) porque conocer el shape exacto de cada
 * tipo de juego no es una invariante del agregado `Game` — es una regla de
 * la aplicación sobre qué datos acepta cada modalidad.
 */
export interface ContentValidator {
  validateConfig(config: unknown): Record<string, unknown>;
  /** `config` recibe el resultado ya validado de `validateConfig` — algunos tipos de juego necesitan conocerlo para validar la forma del contenido (ej. el `mode` de MEMORY_MATCH). */
  validateContent(content: unknown, config?: Record<string, unknown>): unknown[];
}
