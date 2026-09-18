import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Siembra el nivel de ejemplo de Dúo Lógico (motor PixiJS): mismo criterio
 * que seed-dual-quest-demo.ts (el juego de grid) pero para DUAL_QUEST_PIXI
 * — física real, gravedad, nadar en el propio elemento. Los datos son el
 * mismo `level1EnergiaRenovable` del cliente
 * (client/src/components/home/games/dual-quest-pixi/levels/level1EnergiaRenovable.ts),
 * copiados aquí como objeto plano porque el seed corre en el servidor sin
 * acceso al código del cliente — si el nivel cambia allá, hay que
 * reflejarlo aquí a mano.
 *
 * Es idempotente: correrlo dos veces no duplica el juego (upsert por slug).
 *
 * Uso: npm run db:seed:dual-quest-pixi-demo
 */

const SLUG = 'ciudad-sostenible-dual-quest-pixi';
const GAME_ID = 'seed-dual-quest-pixi-ciudad-sostenible-1';
const CATEGORY_NAME = 'Ciencias Naturales';
const CATEGORY_SLUG = 'ciencias-naturales';

const CONFIG = {
  widthPx: 1700,
  heightPx: 1000,
  fireStart: { x: 80, y: 800 },
  waterStart: { x: 170, y: 800 },
  dog: { x: 230, y: 800 },
  platforms: [
    { x: 0, y: 860, width: 300, height: 140, material: 'concrete' },
    { x: 460, y: 860, width: 260, height: 140, material: 'concrete' },
    { x: 560, y: 760, width: 110, height: 40, material: 'metal' },
    { x: 650, y: 660, width: 110, height: 40, material: 'metal' },
    { x: 460, y: 560, width: 400, height: 40, material: 'concrete' },
    { x: 1020, y: 560, width: 260, height: 40, material: 'concrete' },
    { x: 700, y: 420, width: 140, height: 30, material: 'metal' },
    { x: 760, y: 460, width: 90, height: 30, material: 'dirt' },
    { x: 840, y: 360, width: 90, height: 30, material: 'dirt' },
    { x: 1080, y: 420, width: 90, height: 30, material: 'metal' },
    { x: 1160, y: 320, width: 90, height: 30, material: 'metal' },
    { x: 900, y: 260, width: 700, height: 40, material: 'concrete' },
  ],
  liquids: [{ x: 860, y: 560, width: 160, height: 120, kind: 'LAVA' }],
  crates: [{ x: 560, y: 500, size: 48 }],
  buttons: [
    { id: 'dogButton', x: 220, y: 860, momentary: true },
    { id: 'leverFinal', x: 560, y: 860, momentary: false },
  ],
  bridges: [{ id: 'bridge1', x: 380, y: 860, width: 160, height: 30, requires: ['dogButton'], logic: 'AND' }],
  doors: [{ id: 'doorFinal', x: 700, y: 790, width: 30, height: 140, requires: ['leverFinal'], logic: 'AND' }],
  portal: { x: 1500, y: 220, width: 100, height: 120 },
  finalReveal: {
    title: 'Ciudad Sostenible I: Energía que se comparte',
    // TODO: reemplazar por imágenes reales — de momento son rutas que no existen.
    positiveUrl: '/assets/dual-quest/reveal-energia-positivo.svg',
    negativeUrl: '/assets/dual-quest/reveal-energia-negativo.svg',
    summary:
      'A la izquierda, una ciudad con energía renovable repartida y rutas seguras para todos. A la derecha, una ciudad que depende de una sola fuente contaminante y dejó sin alternativa a quienes más la necesitaban.',
  },
};

const CONTENT = [
  {
    id: 'piece-1',
    x: 150,
    y: 800,
    role: null,
    color: '#FFD166',
    glow: '#FACC15',
    concept: {
      title: 'Energía Compartida',
      body: 'Una ciudad sostenible reparte su energía entre todos sus barrios en vez de concentrarla en unos pocos — por eso aquí nadie cruza solo.',
    },
  },
  {
    id: 'piece-2',
    x: 770,
    y: 390,
    role: null,
    color: '#38BDF8',
    glow: '#38BDF8',
    concept: {
      title: 'Infraestructura Compartida',
      body: 'Mover un solo bloque pesado entre dos personas construye más rápido que hacerlo solos — así se construyen las ciudades reales.',
    },
  },
  {
    id: 'piece-3',
    x: 940,
    y: 620,
    role: 'FIRE',
    color: '#FDBA74',
    glow: '#F97316',
    concept: {
      title: 'Resiliencia Energética',
      body: 'Una fuente de energía renovable (como Lumen en la lava) sigue funcionando donde otras fuentes fallarían.',
    },
  },
  {
    id: 'piece-4',
    x: 885,
    y: 330,
    role: 'WATER',
    color: '#7DD3FC',
    glow: '#38BDF8',
    concept: {
      title: 'Gestión del Agua',
      body: 'Cuando una ruta está contaminada o es peligrosa, una ciudad sostenible siempre planea una alternativa segura — la ruta alta de Gota.',
    },
  },
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
      title: 'Ciudad Sostenible I: Energía que se comparte (motor físico)',
      description:
        'Cooperativo de 2 jugadores con física real: Lumen salta y nada libre en la lava, Gota nada libre en el agua — cada uno muere en el elemento del otro. Empujen una caja, manden al perro a sostener un botón y crucen un canal de lava contenido para juntar las 4 fichas y llegar juntos al portal.',
      gameType: 'DUAL_QUEST_PIXI',
      theme: { primaryColor: '#1f8a5f', coverImageUrl: null },
      categoryId,
      // Sin creador humano: es contenido del equipo, no de un usuario (mismo
      // criterio que seed-dual-quest-demo.ts y seed-maze-collector-demos.ts).
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
