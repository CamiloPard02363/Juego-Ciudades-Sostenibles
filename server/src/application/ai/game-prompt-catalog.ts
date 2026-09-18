import type { GameTypeName } from '../../domain/value-objects/game-type.vo.js';

/**
 * Instrucciones + forma de JSON esperada por cada `gameType` soportado por el
 * asistente de IA. Se construyen a partir de las interfaces que ya definen
 * los `content-validators` (misma fuente de verdad, sin duplicar reglas) —
 * agregar un tipo de juego nuevo al asistente es agregar una entrada acá,
 * nada más.
 *
 * Solo cubre tipos de juego sin imagen obligatoria por elemento (Quién Es,
 * Parejas y Opuestos quedan fuera: la IA no puede inventar esas imágenes) y
 * sin geometría espacial compleja (Dual Quest queda fuera por ahora — ver
 * homeworks del branch).
 */
export interface GamePromptSpec {
  /** Instrucciones para el modelo: qué debe producir y con qué criterio pedagógico. */
  instructions: string;
  /** Ejemplo de la forma exacta de JSON esperada (se incluye literal en el prompt). */
  jsonShapeExample: string;
}

const DOMINO_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego de Dominó educativo a partir del texto fuente.
Extrae entre 6 y 10 conceptos clave del texto (términos, personajes, fechas, eventos — lo que
tenga más sentido para el tema). Cada concepto necesita una "label" corta (máximo 60 caracteres)
y un color hexadecimal distinto y armonioso para cada uno. Para "icon" usa siempre el valor
"star" (el cliente resuelve un ícono visual aparte; no inventes otras claves).`,
  jsonShapeExample: `{
  "config": { "handSize": 7 },
  "content": [
    { "label": "Fotosíntesis", "icon": "star", "color": "#22c55e" },
    { "label": "Clorofila", "icon": "star", "color": "#16a34a" }
  ]
}`,
};

const MAZE_COLLECTOR_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego de laberinto recolector educativo a partir del texto
fuente. Extrae entre 4 y 16 objetos/conceptos temáticos del texto, cada uno con "label" corta
(máximo 60 caracteres), un "color" hexadecimal, y opcionalmente un "fact" (dato educativo breve,
máximo 200 caracteres) que resuma por qué ese concepto importa. Para "icon" usa siempre el valor
"star". También define "collectorLabel"/"enemyLabel" (nombres temáticos cortos acordes al tema del
texto, ej. si el texto es sobre reciclaje: collectorLabel="Camión reciclador", enemyLabel="Nube de
contaminación") y usa "star" también para "collectorIcon"/"enemyIcon". Deja "layout":"CLASSIC",
"lives":3 y "enemySpeed":2 salvo que el texto sugiera claramente otra cosa.`,
  jsonShapeExample: `{
  "config": {
    "layout": "CLASSIC", "lives": 3, "enemySpeed": 2,
    "collectorLabel": "Camión reciclador", "collectorIcon": "star",
    "enemyLabel": "Nube de contaminación", "enemyIcon": "star"
  },
  "content": [
    { "label": "Vidrio", "icon": "star", "color": "#3b82f6", "fact": "Tarda miles de años en degradarse." }
  ]
}`,
};

const SNAKES_LADDERS_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego de Escaleras y Serpientes educativo a partir del
texto fuente. Primero define "boardSize" (entero entre 25 y 40), y una lista de "ladders"
(escaleras, "to" > "from") y "snakes" (serpientes, "to" < "from") usando casillas entre 2 y
boardSize-1, sin que ninguna casilla se repita como origen. Luego, en "content", genera una
pregunta de opción múltiple (con "prompt", entre 2 y 6 "options" y "correctOptionIndex") basada en
el texto fuente para CADA escalera y CADA serpiente que declaraste (con el "cellNumber" y
"triggerType" LADDER o SNAKE correspondiente a su casilla de origen), más al menos 5 preguntas
adicionales de "triggerType":"CELL" en otras casillas normales del tablero. Todas las preguntas
deben evaluar contenido real extraído del texto fuente, nunca trivia genérica.`,
  jsonShapeExample: `{
  "config": {
    "boardSize": 30, "turnDurationSeconds": 45,
    "ladders": [{ "from": 4, "to": 14 }],
    "snakes": [{ "from": 20, "to": 8 }]
  },
  "content": [
    { "cellNumber": 4, "triggerType": "LADDER", "prompt": "¿...?", "options": ["A", "B"], "correctOptionIndex": 0 },
    { "cellNumber": 20, "triggerType": "SNAKE", "prompt": "¿...?", "options": ["A", "B"], "correctOptionIndex": 1 },
    { "cellNumber": 7, "triggerType": "CELL", "prompt": "¿...?", "options": ["A", "B", "C"], "correctOptionIndex": 2 }
  ]
}`,
};

const CATALOG: Partial<Record<GameTypeName, GamePromptSpec>> = {
  DOMINO: DOMINO_SPEC,
  MAZE_COLLECTOR: MAZE_COLLECTOR_SPEC,
  SNAKES_LADDERS: SNAKES_LADDERS_SPEC,
};

export function resolveGamePromptSpec(gameType: string): GamePromptSpec | null {
  return CATALOG[gameType as GameTypeName] ?? null;
}

export function supportedAiGameTypes(): GameTypeName[] {
  return Object.keys(CATALOG) as GameTypeName[];
}
