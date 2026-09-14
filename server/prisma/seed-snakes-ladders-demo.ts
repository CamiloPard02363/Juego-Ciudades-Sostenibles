import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Siembra un juego SNAKES_LADDERS de ejemplo (temática de matemáticas: sumas
 * y multiplicaciones) para que exista un juego base jugable en el catálogo
 * — así quien entra al apartado de creación ya tiene algo real que probar
 * antes de armar el suyo, mismo objetivo que seed-maze-collector-demos.ts.
 *
 * Es idempotente: correrlo dos veces no duplica el juego (upsert por slug).
 *
 * Uso: node --experimental-strip-types prisma/seed-snakes-ladders-demo.ts
 */

const SLUG = 'matematicas-escaleras-y-numeros';
const GAME_ID = 'seed-snakes-ladders-matematicas';
const CATEGORY_NAME = 'Matemáticas';
const CATEGORY_SLUG = 'matematicas';

const CONFIG = {
  boardSize: 30,
  turnDurationSeconds: 45,
  // Las escaleras son multiplicaciones (el reto "de alta complejidad" que
  // pide la mecánica); las serpientes son sumas, más rápidas de resolver
  // como "reto de recuperación" antes de resbalar.
  ladders: [
    { from: 4, to: 16 },
    { from: 21, to: 29 },
  ],
  snakes: [
    { from: 18, to: 6 },
    { from: 26, to: 11 },
  ],
};

const CONTENT = [
  {
    cellNumber: 4,
    triggerType: 'LADDER',
    prompt: '¿Cuánto es 6 × 7?',
    options: ['42', '36', '48'],
    correctOptionIndex: 0,
    difficulty: 'HIGH',
  },
  {
    cellNumber: 21,
    triggerType: 'LADDER',
    prompt: '¿Cuánto es 9 × 8?',
    options: ['72', '64', '81'],
    correctOptionIndex: 0,
    difficulty: 'HIGH',
  },
  {
    cellNumber: 18,
    triggerType: 'SNAKE',
    prompt: '¿Cuánto es 15 + 27?',
    options: ['42', '41', '52'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 26,
    triggerType: 'SNAKE',
    prompt: '¿Cuánto es 8 × 9?',
    options: ['72', '63', '81'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 2,
    triggerType: 'CELL',
    prompt: '¿Cuánto es 3 × 4?',
    options: ['12', '10', '14'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 7,
    triggerType: 'CELL',
    prompt: '¿Cuánto es 5 + 9?',
    options: ['14', '13', '15'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 9,
    triggerType: 'CELL',
    prompt: '¿Cuánto es 7 × 3?',
    options: ['21', '24', '18'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 12,
    triggerType: 'CELL',
    prompt: '¿Cuánto es 23 + 19?',
    options: ['42', '41', '43'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 15,
    triggerType: 'CELL',
    prompt: '¿Cuánto es 4 × 9?',
    options: ['36', '32', '40'],
    correctOptionIndex: 0,
  },
  {
    cellNumber: 23,
    triggerType: 'CELL',
    prompt: '¿Cuánto es 18 + 27?',
    options: ['45', '44', '46'],
    correctOptionIndex: 0,
  },
];

async function ensureCategory(
  categories: import('mongodb').Collection,
  name: string,
  slug: string,
): Promise<string> {
  const existing = await categories.findOne({ name });
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
      title: 'Matemáticas: Escaleras y Números',
      description:
        'Sube escaleras resolviendo multiplicaciones y evita resbalar por las serpientes respondiendo sumas. Un juego base de Escaleras y Serpientes para explorar antes de crear el tuyo.',
      gameType: 'SNAKES_LADDERS',
      theme: { primaryColor: '#3b82f6', coverImageUrl: null },
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
