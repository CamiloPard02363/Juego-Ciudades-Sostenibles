import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Siembra un juego TRUE_FALSE_MAZE de ejemplo ("Misión Galáctica",
 * afirmaciones sobre el sistema solar) para que el laberinto de Verdadero o
 * Falso tenga un juego base jugable en el catálogo antes de que alguien
 * cree el suyo — mismo objetivo que seed-snakes-ladders-demo.ts.
 *
 * Es idempotente: correrlo dos veces no duplica el juego (upsert por slug).
 *
 * Uso: npm run db:seed:true-false-maze-demo
 */

const SLUG = 'mision-galactica-verdadero-o-falso';
const GAME_ID = 'seed-true-false-maze-mision-galactica';
const CATEGORY_NAME = 'Ciencias Naturales';
const CATEGORY_SLUG = 'ciencias-naturales';

const CONFIG = {
  skin: 'NAVE_ESPACIAL',
  lives: 3,
  enemyCount: 3,
  enemySpeed: 2,
  relocateSeconds: 20,
  shuffleQuestions: true,
  lightsOut: true,
};

const CONTENT = [
  {
    questionId: 'sol-estrella',
    statement: 'El Sol es una estrella.',
    answer: true,
    explanation: 'El Sol es una estrella enana amarilla; su luz tarda unos 8 minutos en llegar a la Tierra.',
  },
  {
    questionId: 'luna-luz-propia',
    statement: 'La Luna produce su propia luz.',
    answer: false,
    explanation: 'La Luna no brilla por sí misma: refleja la luz del Sol.',
  },
  {
    questionId: 'jupiter-mas-grande',
    statement: 'Júpiter es el planeta más grande del sistema solar.',
    answer: true,
    explanation: 'Júpiter es tan grande que dentro de él cabrían más de 1.300 planetas como la Tierra.',
  },
  {
    questionId: 'mercurio-mas-caliente',
    statement: 'Mercurio es el planeta más caliente del sistema solar.',
    answer: false,
    explanation:
      'El más caliente es Venus: su atmósfera de dióxido de carbono atrapa el calor y supera los 460 °C.',
  },
  {
    questionId: 'tierra-traslacion',
    statement: 'La Tierra tarda un año en dar una vuelta completa alrededor del Sol.',
    answer: true,
    explanation: 'La traslación dura unos 365 días y 6 horas; por eso cada cuatro años hay un año bisiesto.',
  },
  {
    questionId: 'astronautas-gravedad',
    statement: 'Los astronautas flotan en la estación espacial porque allí no hay gravedad.',
    answer: false,
    explanation:
      'Sí hay gravedad: flotan porque la estación y ellos van cayendo juntos alrededor de la Tierra todo el tiempo.',
  },
  {
    questionId: 'marte-rojo',
    statement: 'Marte se ve rojo por el óxido de hierro de su superficie.',
    answer: true,
    explanation: 'El polvo de Marte tiene mucho óxido de hierro, el mismo compuesto que le da color al óxido.',
  },
  {
    questionId: 'sonido-espacio',
    statement: 'En el espacio el sonido viaja más rápido que en la Tierra.',
    answer: false,
    explanation: 'En el vacío del espacio el sonido no puede viajar: necesita un medio como el aire o el agua.',
  },
  {
    questionId: 'saturno-anillos',
    statement: 'Saturno es el único planeta que tiene anillos.',
    answer: false,
    explanation: 'Júpiter, Urano y Neptuno también tienen anillos, aunque son mucho más tenues que los de Saturno.',
  },
  {
    questionId: 'via-lactea',
    statement: 'Nuestro sistema solar está dentro de la galaxia Vía Láctea.',
    answer: true,
    explanation: 'El sistema solar está en uno de los brazos espirales de la Vía Láctea.',
  },
  {
    questionId: 'estrellas-pequenas',
    statement: 'Todas las estrellas que vemos de noche son más pequeñas que el Sol.',
    answer: false,
    explanation: 'Muchas son mucho más grandes que el Sol; se ven pequeñas porque están muchísimo más lejos.',
  },
  {
    questionId: 'rotacion-dia',
    statement: 'El día y la noche existen porque la Tierra gira sobre su propio eje.',
    answer: true,
    explanation: 'La Tierra da una vuelta sobre su eje en unas 24 horas: la cara que mira al Sol tiene de día.',
  },
];

async function ensureCategory(
  categories: import('mongodb').Collection,
  name: string,
  slug: string,
): Promise<string> {
  // Mismo criterio que los otros seeds: busca por nombre O por slug para
  // reusar la materia aunque el nombre no calce exacto.
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
      title: 'Misión Galáctica: ¿Verdadero o Falso?',
      description:
        'Guía al robot por la nave espacial, esquiva a las medusas galácticas y responde corriendo a la sala VERDADERO o FALSO. Afirmaciones sobre el sistema solar para explorar antes de crear tu propio laberinto.',
      gameType: 'TRUE_FALSE_MAZE',
      theme: { primaryColor: '#8b5cf6', coverImageUrl: null },
      categoryId,
      // Contenido del equipo, no de un usuario (mismo criterio que los otros seeds).
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
