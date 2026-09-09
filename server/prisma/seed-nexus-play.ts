import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Siembra el dominó "Nexus Play: Ecosistemas Sostenibles" (creado en #17 como
 * componente hardcodeado) como el primer juego publicado del tipo DOMINO, ya
 * dentro del sistema genérico de tipos de juego (#18).
 *
 * Los conceptos son exactamente los que tenía el componente original, así que
 * el juego se ve y se juega igual — la diferencia es que ahora es contenido en
 * la base, editable/moderable como cualquier otro juego de la comunidad.
 *
 * Es idempotente: correrlo dos veces no duplica el juego (upsert por slug).
 *
 * Uso: node --experimental-strip-types prisma/seed-nexus-play.ts
 */

const SLUG = 'nexus-play-ecosistemas-sostenibles';
const GAME_ID = 'seed-nexus-play-ecosistemas-sostenibles';

/** Mismos 6 conceptos del DominoGame original de #17, con su ícono y su color. */
const CONCEPTS = [
  { conceptId: 'concept-0', label: 'Paneles Solares', icon: 'sun', color: '#f59e0b' },
  { conceptId: 'concept-1', label: 'Zonas Verdes', icon: 'leaf', color: '#22c55e' },
  { conceptId: 'concept-2', label: 'Movilidad Eléctrica', icon: 'zap', color: '#3b82f6' },
  { conceptId: 'concept-3', label: 'Reciclaje', icon: 'recycle', color: '#14b8a6' },
  { conceptId: 'concept-4', label: 'Purificación de Agua', icon: 'droplets', color: '#06b6d4' },
  { conceptId: 'concept-5', label: 'Energía Eólica', icon: 'wind', color: '#8b5cf6' },
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está configurada.');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // El juego necesita una materia: se reutiliza la de sostenibilidad/medio
    // ambiente si ya existe, y si no se crea (misma forma que usa la app).
    const categories = db.collection('categories');
    const categoryName = 'Medio Ambiente';
    let category = await categories.findOne({ name: categoryName });

    if (!category) {
      const categoryId = 'seed-category-medio-ambiente';
      await categories.insertOne({
        _id: categoryId,
        name: categoryName,
        slug: 'medio-ambiente',
        creatorUserId: null,
        createdAt: new Date(),
      } as never);
      category = await categories.findOne({ _id: categoryId } as never);
      console.log(`Materia creada: ${categoryName}`);
    }

    const games = db.collection('games');
    const existing = await games.findOne({ slug: SLUG });
    const now = new Date();

    const document = {
      slug: SLUG,
      title: 'Nexus Play: Ecosistemas Sostenibles',
      description:
        'Dominó temático de sostenibilidad urbana: conecta paneles solares, zonas verdes, reciclaje y más, empatando los extremos abiertos como en el dominó tradicional.',
      gameType: 'DOMINO',
      theme: { primaryColor: '#22c55e', coverImageUrl: null },
      categoryId: String(category?._id),
      // Sin creador humano: es contenido del equipo, no de un usuario. Solo un
      // ADMIN puede despublicarlo (ver canBeManagedBy en la entidad Game).
      creatorUserId: 'system',
      status: 'PUBLISHED',
      config: { handSize: 7 },
      content: CONCEPTS,
      updatedAt: now,
    };

    if (existing) {
      await games.updateOne({ slug: SLUG }, { $set: document });
      console.log(`Dominó "Nexus Play" actualizado (slug: ${SLUG}).`);
    } else {
      await games.insertOne({ _id: GAME_ID, ...document, createdAt: now } as never);
      console.log(`Dominó "Nexus Play" sembrado como juego PUBLISHED (slug: ${SLUG}).`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
