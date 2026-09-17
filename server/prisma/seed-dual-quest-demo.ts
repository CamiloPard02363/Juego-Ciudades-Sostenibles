import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Siembra un juego DUAL_QUEST de ejemplo (temática de programación: el flujo
 * de autenticación de una app web) para que exista un juego base jugable en
 * el catálogo — mismo objetivo que seed-snakes-ladders-demo.ts y
 * seed-maze-collector-demos.ts: quien entra a crear ya tiene algo real que
 * probar antes de armar el suyo.
 *
 * Mapa: dos carriles horizontales (fila 1 = FUEGO/Frontend, fila 4 =
 * AGUA/Backend) unidos por un corredor central libre que lleva a la Gema
 * Núcleo. Cada carril tiene una compuerta que solo el OTRO rol puede abrir
 * (dependencia obligatoria): AGUA configura los headers CORS para abrirle
 * paso a FUEGO, y FUEGO responde qué debe validar el formulario para
 * abrirle paso a AGUA.
 *
 * Es idempotente: correrlo dos veces no duplica el juego (upsert por slug).
 *
 * Uso: npm run db:seed:dual-quest-demo
 */

const SLUG = 'programacion-duo-logico-autenticacion';
const GAME_ID = 'seed-dual-quest-auth-flow';
const CATEGORY_NAME = 'Programación';
const CATEGORY_SLUG = 'programacion';

// 0 = libre, 1 = muro, 2 = solo pasable por FIRE, 3 = solo pasable por WATER.
const GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 3, 3, 3, 3, 3, 3, 0, 3, 3, 3, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const CONFIG = {
  coreQuestion:
    'Ordena el flujo correcto de autenticación de una aplicación web, desde que el usuario escribe sus datos hasta que el frontend guarda su sesión.',
  gridCols: 12,
  gridRows: 6,
  grid: GRID,
  fireStart: { row: 1, col: 1 },
  waterStart: { row: 4, col: 1 },
  corePosition: { row: 2, col: 6 },
  gates: [
    { gateId: 'cors-gate', position: { row: 1, col: 4 } },
    { gateId: 'validation-gate', position: { row: 4, col: 7 } },
  ],
  triggers: [
    {
      triggerId: 'water-configures-cors',
      kind: 'SWITCH',
      activatedByRole: 'WATER',
      switchPosition: { row: 4, col: 3 },
      gateId: 'cors-gate',
    },
    {
      triggerId: 'fire-validates-form',
      kind: 'QUESTION',
      activatedByRole: 'FIRE',
      switchPosition: { row: 1, col: 3 },
      gateId: 'validation-gate',
      prompt: '¿Qué debe validar el frontend ANTES de enviar el formulario de login al backend?',
      options: [
        'Que el email y la contraseña no estén vacíos',
        'El color del botón de enviar',
        'El número de visitas a la página',
      ],
      correctOptionIndex: 0,
    },
  ],
};

const CONTENT = [
  { gemId: 'fire-input', role: 'FIRE', position: { row: 1, col: 2 }, label: 'Captura el input del formulario', order: 1 },
  { gemId: 'fire-fetch', role: 'FIRE', position: { row: 1, col: 5 }, label: 'Envía la petición fetch al backend', order: 2 },
  { gemId: 'water-query', role: 'WATER', position: { row: 4, col: 2 }, label: 'Consulta las credenciales en la base de datos', order: 3 },
  { gemId: 'water-bcrypt', role: 'WATER', position: { row: 4, col: 5 }, label: 'Compara la contraseña con bcrypt', order: 4 },
  { gemId: 'water-token', role: 'WATER', position: { row: 4, col: 9 }, label: 'Genera el token JWT firmado', order: 5 },
  { gemId: 'fire-storage', role: 'FIRE', position: { row: 1, col: 9 }, label: 'Guarda el JWT en el navegador', order: 6 },
];

async function ensureCategory(
  categories: import('mongodb').Collection,
  name: string,
  slug: string,
): Promise<string> {
  // Busca por nombre O por slug: si ya existe una categoría con este slug
  // pero un `name` que no calza exacto (mayúsculas, espacios, tilde
  // distinta), buscar solo por `name` no la encuentra y el insertOne de
  // abajo revienta contra el índice único de slug en vez de reusarla.
  const existing = await categories.findOne({ $or: [{ name }, { slug }] });
  if (existing) return String(existing._id);

  const categoryId = `seed-category-${slug}`;
  await categories.insertOne({
    _id: categoryId,
    name,
    slug,
    creatorUserId: null,
    createdAt: new Date(),
  } as never);
  console.log(`Materia creada: ${name}`);
  return categoryId;
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está configurada.');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const categories = db.collection('categories');
    const games = db.collection('games');
    const now = new Date();

    const categoryId = await ensureCategory(categories, CATEGORY_NAME, CATEGORY_SLUG);

    const document = {
      slug: SLUG,
      title: 'Dúo Lógico: Flujo de Autenticación Web',
      description:
        'Cooperativo de 2 jugadores en tiempo real: Fuego (Frontend) y Agua (Backend) recorren el mismo mapa, cada uno bloqueado por compuertas que solo el otro puede abrir, y arman juntos el flujo correcto de un login. Un juego base de Dúo Lógico para explorar antes de crear el tuyo.',
      gameType: 'DUAL_QUEST',
      theme: { primaryColor: '#f97316', coverImageUrl: null },
      categoryId,
      // Sin creador humano: es contenido del equipo, no de un usuario (mismo
      // criterio que seed-nexus-play.ts y seed-maze-collector-demos.ts).
      creatorUserId: 'system',
      status: 'PUBLISHED',
      config: CONFIG,
      content: CONTENT,
      updatedAt: now,
    };

    const existing = await games.findOne({ slug: SLUG });
    if (existing) {
      await games.updateOne({ slug: SLUG }, { $set: document });
      console.log(`"${document.title}" actualizado (slug: ${SLUG}).`);
    } else {
      await games.insertOne({ _id: GAME_ID, ...document, createdAt: now } as never);
      console.log(`"${document.title}" sembrado como juego PUBLISHED (slug: ${SLUG}).`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
