/**
 * Contenido y configuración del "Laberinto Verdadero o Falso"
 * (TRUE_FALSE_MAZE). Espeja lo que valida el servidor en
 * `true-false-maze.content-validator.ts`: si cambia un límite allá, se
 * ajusta acá también (el formulario valida con estos mismos valores).
 */

/** Una afirmación del juego: el jugador decide si es verdadera o falsa llegando a la sala correspondiente. */
export type TrueFalseMazeQuestion = {
  questionId: string
  statement: string
  answer: boolean
  /** Se muestra después de responder, acierte o no. */
  explanation?: string
}

/**
 * Escenario visual (mapa + personajes). Hoy solo existe la nave espacial
 * del robot y las medusas galácticas; un tema nuevo agrega su valor acá, en
 * el validador del servidor y su set de sprites (ver README.md).
 */
export type TrueFalseMazeSkin = 'NAVE_ESPACIAL'

export type TrueFalseMazeConfig = {
  skin: TrueFalseMazeSkin
  lives: number
  enemyCount: number
  enemySpeed: number
  /** Cada cuántos segundos se mueven las salas VERDADERO/FALSO; 0 = solo al cambiar de pregunta. */
  relocateSeconds: number
  shuffleQuestions: boolean
  /** Apagones breves ("sabotaje") donde solo se ve alrededor del robot. */
  lightsOut: boolean
}

export const DEFAULT_TRUE_FALSE_MAZE_CONFIG: TrueFalseMazeConfig = {
  skin: 'NAVE_ESPACIAL',
  lives: 3,
  enemyCount: 3,
  enemySpeed: 2,
  relocateSeconds: 20,
  shuffleQuestions: true,
  lightsOut: true,
}

export const MIN_TF_QUESTIONS = 3
export const MAX_TF_QUESTIONS = 30
export const MIN_TF_STATEMENT_LENGTH = 5
export const MAX_TF_STATEMENT_LENGTH = 160
export const MAX_TF_EXPLANATION_LENGTH = 240

export const TF_RELOCATE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Solo al cambiar de pregunta' },
  { value: 30, label: 'Cada 30 segundos (tranquilo)' },
  { value: 20, label: 'Cada 20 segundos (recomendado)' },
  { value: 12, label: 'Cada 12 segundos (frenético)' },
]

function intInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback
}

/**
 * Mezcla el `config` guardado con los valores por defecto. El servidor ya
 * lo validó al crear el juego; esto solo protege al reproductor de juegos
 * guardados antes de que existiera algún campo.
 */
export function resolveTrueFalseMazeConfig(raw: unknown): TrueFalseMazeConfig {
  const value = (raw ?? {}) as Partial<Record<keyof TrueFalseMazeConfig, unknown>>
  const relocate = value.relocateSeconds
  return {
    skin: 'NAVE_ESPACIAL',
    lives: intInRange(value.lives, 1, 5, DEFAULT_TRUE_FALSE_MAZE_CONFIG.lives),
    enemyCount: intInRange(value.enemyCount, 1, 4, DEFAULT_TRUE_FALSE_MAZE_CONFIG.enemyCount),
    enemySpeed: intInRange(value.enemySpeed, 1, 3, DEFAULT_TRUE_FALSE_MAZE_CONFIG.enemySpeed),
    relocateSeconds:
      relocate === 0 ? 0 : intInRange(relocate, 10, 60, DEFAULT_TRUE_FALSE_MAZE_CONFIG.relocateSeconds),
    shuffleQuestions:
      typeof value.shuffleQuestions === 'boolean' ? value.shuffleQuestions : DEFAULT_TRUE_FALSE_MAZE_CONFIG.shuffleQuestions,
    lightsOut: typeof value.lightsOut === 'boolean' ? value.lightsOut : DEFAULT_TRUE_FALSE_MAZE_CONFIG.lightsOut,
  }
}

/** Filtra del contenido guardado lo que no tenga forma de afirmación (defensivo, igual que el config). */
export function resolveTrueFalseMazeQuestions(raw: unknown): TrueFalseMazeQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    const value = (item ?? {}) as Record<string, unknown>
    if (typeof value.statement !== 'string' || typeof value.answer !== 'boolean') return []
    return [
      {
        questionId: typeof value.questionId === 'string' && value.questionId ? value.questionId : `q-${index + 1}`,
        statement: value.statement,
        answer: value.answer,
        ...(typeof value.explanation === 'string' && value.explanation.trim()
          ? { explanation: value.explanation.trim() }
          : {}),
      },
    ]
  })
}
