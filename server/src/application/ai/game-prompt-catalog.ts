import type { GameTypeName } from '../../domain/value-objects/game-type.vo.js';

/**
 * Instrucciones + forma de JSON esperada por cada `gameType` (y, para
 * MEMORY_MATCH, por `mode`) soportado por el asistente de IA. Se construyen a
 * partir de las interfaces que ya definen los `content-validators` (misma
 * fuente de verdad, sin duplicar reglas) — agregar un tipo de juego nuevo al
 * asistente es agregar una entrada acá, nada más.
 */
export interface GamePromptSpec {
  /** Instrucciones para el modelo: qué debe producir y con qué criterio pedagógico. */
  instructions: string;
  /** Ejemplo de la forma exacta de JSON esperada (se incluye literal en el prompt). */
  jsonShapeExample: string;
  /**
   * Cuando el tipo de juego necesita una imagen real por elemento (Quién Es,
   * Parejas), la IA no puede inventarlas: el usuario SIEMPRE sube las
   * imágenes él mismo y la IA solo las organiza — les asigna un concepto y
   * arma el contenido, referenciándolas por índice (`imageIndex`) en vez de
   * por URL, para no depender de que el modelo "recuerde" URLs reales.
   * `null` significa que el juego no necesita este flujo (o porque no usa
   * imágenes, o porque son opcionales y se agregan a mano después, como en
   * Opuestos).
   */
  imageRequirement: { min: number; max: number } | null;
  /** Carpeta de Cloudinary donde subir las imágenes de contenido (mismas que usa la subida manual). */
  contentImageFolder?: string;
}

function catalogKey(gameType: GameTypeName, mode?: string): string {
  return mode ? `${gameType}:${mode}` : gameType;
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
  imageRequirement: null,
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
  imageRequirement: null,
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
  imageRequirement: null,
};

const GUESS_WHO_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego de "¿Quién Es?" a partir de las imágenes que subió el
usuario (y del texto fuente, si lo hay, como contexto adicional del tema). El usuario ya subió sus
propias imágenes — nunca inventes una URL: cada tarjeta debe referenciar la imagen que le
corresponde con "imageIndex" (el número de imagen, 0-based, de la lista "Imágenes disponibles" de
abajo). Genera EXACTAMENTE una tarjeta por cada imagen disponible, usando cada índice de imagen
UNA sola vez (nunca repitas un imageIndex ni dejes uno sin usar). Para cada imagen, escribe un
"label" corto (máximo 120 caracteres) que identifique con precisión lo que muestra esa imagen
específica (ej. si es la bandera de un país, el nombre de ese país) — basándote en la descripción
de esa imagen. No agregues "imageUrl" ni "audioUrl", solo "imageIndex" y "label".`,
  jsonShapeExample: `{
  "config": { "maxAccusationCount": 6, "turnDurationSeconds": 15 },
  "content": [
    { "imageIndex": 0, "label": "Argentina" },
    { "imageIndex": 1, "label": "Brasil" }
  ]
}`,
  imageRequirement: { min: 12, max: 60 },
  contentImageFolder: 'guess-who-cards',
};

const MEMORY_MATCH_PAIRS_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego de memoria (parejas imagen-concepto) a partir de las
imágenes que subió el usuario (y del texto fuente, si lo hay, como contexto adicional del tema). El
usuario ya subió sus propias imágenes — nunca inventes una URL: cada pareja debe referenciar su
imagen con "imageIndex" (el número de imagen, 0-based, de la lista "Imágenes disponibles" de abajo).
Genera EXACTAMENTE una pareja por cada imagen disponible, usando cada índice de imagen UNA sola vez.
Para cada imagen, escribe un "label" corto (máximo 120 caracteres) que nombre con precisión el
concepto que muestra esa imagen específica, basándote en su descripción. No agregues "imageUrl",
solo "imageIndex" y "label".`,
  jsonShapeExample: `{
  "config": { "mode": "PAIRS", "perZone": 8, "timePerZoneSeconds": 90, "previewSeconds": 5 },
  "content": [
    { "imageIndex": 0, "label": "Mitocondria" },
    { "imageIndex": 1, "label": "Núcleo celular" }
  ]
}`,
  imageRequirement: { min: 4, max: 40 },
  contentImageFolder: 'memory-cards',
};

const MEMORY_MATCH_OPPOSITES_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego de memoria de conceptos OPUESTOS a partir del texto
fuente (sin imágenes: el modo Opuestos no las necesita para jugarse — el profesor puede agregarlas
después a mano si quiere, es opcional). Extrae entre 4 y 10 parejas de conceptos contrapuestos del
texto (ej. ácido/base, antes/después de un evento, causa/efecto). Cada pareja necesita "posTitle" y
"negTitle" (máximo 120 caracteres cada uno) y "posDescription"/"negDescription" (máximo 500
caracteres cada uno) explicando brevemente cada lado. Incluye siempre "posImageUrl": null y
"negImageUrl": null (literalmente null, nunca un texto ni una URL inventada).`,
  jsonShapeExample: `{
  "config": { "mode": "OPPOSITES", "perZone": 8, "timePerZoneSeconds": 90, "previewSeconds": 5 },
  "content": [
    {
      "posTitle": "Ácido", "posDescription": "pH menor a 7...", "posImageUrl": null,
      "negTitle": "Base", "negDescription": "pH mayor a 7...", "negImageUrl": null
    }
  ]
}`,
  imageRequirement: null,
};

const DUAL_QUEST_SPEC: GamePromptSpec = {
  instructions: `Genera el contenido de un juego "Dúo Lógico" a partir del texto fuente. Es el tipo de
juego más exigente en geometría — sigue las reglas al pie de la letra:
1. Elige "gridCols" y "gridRows" PEQUEÑOS y manejables: entre 8 y 12 columnas, entre 6 y 9 filas.
2. "grid" es una matriz de gridRows filas × gridCols columnas, valores: 0=libre, 1=muro,
   2=solo pasable por FIRE, 3=solo pasable por WATER. Deja la MAYORÍA de casillas en 0 (libre),
   usa 1/2/3 con moderación y SIEMPRE deja un camino de casillas libres (0) conectando ambos lados.
3. "fireStart" debe caer en una casilla pasable para FIRE (valor 0 o 2). "waterStart" debe caer en
   una casilla pasable para WATER (valor 0 o 3). "corePosition" debe caer en una casilla libre (0).
4. Declara 1 o 2 "gates" (compuertas), cada una en una casilla libre (0) distinta de fireStart/
   waterStart/corePosition, con un "gateId" único (ej. "gate-1").
5. Por cada gate declara EXACTAMENTE un "trigger" en "triggers" con ese mismo "gateId": "kind"
   "QUESTION" (con "prompt" del texto fuente, 2-4 "options" y "correctOptionIndex"),
   "activatedByRole" (FIRE o WATER) y "switchPosition" en una casilla pasable para ese rol.
6. En "content", genera "fragmentGems": al menos 2 gemas con "role":"FIRE" y al menos 2 con
   "role":"WATER", cada una en una casilla pasable para su rol, con "label" corto extraído del
   texto fuente y "order" del 1 al N SIN huecos ni repetidos combinando ambos roles (ej. con 4
   gemas: order 1,2,3,4 en cualquier orden entre ellas, cada valor usado una sola vez).
7. "coreQuestion" es la hipótesis/pregunta final que arman las gemas juntas, extraída del texto.`,
  jsonShapeExample: `{
  "config": {
    "coreQuestion": "¿Qué proceso combina fuego y agua para...?",
    "gridCols": 10, "gridRows": 7,
    "grid": [[0,0,0,0,0,0,0,0,0,0], [0,0,0,0,0,0,0,0,0,0], [0,0,0,0,1,0,0,0,0,0], [0,0,0,0,0,0,0,0,0,0], [0,0,0,0,0,0,0,0,0,0], [0,0,0,0,0,0,0,0,0,0], [0,0,0,0,0,0,0,0,0,0]],
    "fireStart": { "row": 0, "col": 0 }, "waterStart": { "row": 0, "col": 9 },
    "corePosition": { "row": 3, "col": 4 },
    "gates": [{ "gateId": "gate-1", "position": { "row": 3, "col": 5 } }],
    "triggers": [{ "triggerId": "trigger-1", "kind": "QUESTION", "activatedByRole": "FIRE", "switchPosition": { "row": 1, "col": 1 }, "gateId": "gate-1", "prompt": "¿...?", "options": ["A", "B"], "correctOptionIndex": 0 }]
  },
  "content": [
    { "gemId": "gem-1", "role": "FIRE", "position": { "row": 2, "col": 1 }, "label": "...", "order": 1 },
    { "gemId": "gem-2", "role": "WATER", "position": { "row": 2, "col": 8 }, "label": "...", "order": 2 },
    { "gemId": "gem-3", "role": "FIRE", "position": { "row": 4, "col": 1 }, "label": "...", "order": 3 },
    { "gemId": "gem-4", "role": "WATER", "position": { "row": 4, "col": 8 }, "label": "...", "order": 4 }
  ]
}`,
  imageRequirement: null,
};

const CATALOG: Record<string, GamePromptSpec> = {
  [catalogKey('DOMINO')]: DOMINO_SPEC,
  [catalogKey('MAZE_COLLECTOR')]: MAZE_COLLECTOR_SPEC,
  [catalogKey('SNAKES_LADDERS')]: SNAKES_LADDERS_SPEC,
  [catalogKey('GUESS_WHO')]: GUESS_WHO_SPEC,
  [catalogKey('MEMORY_MATCH', 'PAIRS')]: MEMORY_MATCH_PAIRS_SPEC,
  [catalogKey('MEMORY_MATCH', 'OPPOSITES')]: MEMORY_MATCH_OPPOSITES_SPEC,
  [catalogKey('DUAL_QUEST')]: DUAL_QUEST_SPEC,
};

export function resolveGamePromptSpec(gameType: string, mode?: string): GamePromptSpec | null {
  return CATALOG[catalogKey(gameType as GameTypeName, mode)] ?? null;
}
