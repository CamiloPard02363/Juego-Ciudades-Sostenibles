import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Siembra dos juegos MAZE_COLLECTOR de ejemplo, con los dos temas que se
 * usaron para presentar este tipo de juego: uno de sostenibilidad (camión de
 * reciclaje esquivando nubes de contaminación) y uno de programación
 * (antivirus esquivando troyanos). El motor es el mismo para los dos — la
 * diferencia es enteramente contenido (labels, íconos, colores, datos
 * educativos), tal como está diseñado el tipo de juego.
 *
 * Es idempotente: correrlo dos veces no duplica los juegos (upsert por slug).
 *
 * Uso: npm run db:seed:maze-collector-demos
 */

type SeedItem = {
  itemId: string;
  label: string;
  icon: string;
  color: string;
  fact?: string;
};

type SeedGame = {
  slug: string;
  id: string;
  title: string;
  description: string;
  categoryName: string;
  categorySlug: string;
  theme: { primaryColor: string; coverImageUrl: null };
  config: {
    layout: 'CLASSIC' | 'CROSS' | 'SPIRAL' | 'CITY';
    lives: number;
    enemySpeed: number;
    collectorLabel: string;
    collectorIcon: string;
    enemyLabel: string;
    enemyIcon: string;
  };
  content: SeedItem[];
};

const GAMES: SeedGame[] = [
  {
    slug: 'camion-reciclador-vs-contaminacion',
    id: 'seed-maze-camion-reciclador',
    title: 'Camión Reciclador',
    description:
      'Recorre la ciudad recolectando materiales reciclables mientras esquivas las nubes de contaminación.',
    categoryName: 'Medio Ambiente',
    categorySlug: 'medio-ambiente',
    theme: { primaryColor: '#22c55e', coverImageUrl: null },
    config: {
      layout: 'CITY',
      lives: 3,
      enemySpeed: 2,
      collectorLabel: 'Camión de Reciclaje',
      collectorIcon: 'car',
      enemyLabel: 'Nube de Contaminación',
      enemyIcon: 'cloud',
    },
    content: [
      {
        itemId: 'vidrio',
        label: 'Vidrio',
        icon: 'flaskConical',
        color: '#22c55e',
        fact: 'El vidrio puede reciclarse infinitas veces sin perder calidad.',
      },
      {
        itemId: 'papel',
        label: 'Papel y Cartón',
        icon: 'bookOpen',
        color: '#3b82f6',
        fact: 'Reciclar una tonelada de papel salva alrededor de 17 árboles.',
      },
      {
        itemId: 'plastico',
        label: 'Plástico',
        icon: 'trash',
        color: '#eab308',
        fact: 'Una botella de plástico puede tardar hasta 450 años en degradarse.',
      },
      {
        itemId: 'organico',
        label: 'Materia Orgánica',
        icon: 'leaf',
        color: '#84cc16',
        fact: 'Los residuos orgánicos se pueden convertir en compost para la tierra.',
      },
      {
        itemId: 'metal',
        label: 'Metales',
        icon: 'wrench',
        color: '#6b7280',
        fact: 'El aluminio reciclado ahorra hasta 95% de la energía usada para producirlo nuevo.',
      },
      {
        itemId: 'electronico',
        label: 'Electrónicos',
        icon: 'cpu',
        color: '#a855f7',
        fact: 'Los aparatos electrónicos contienen materiales valiosos que se pueden recuperar.',
      },
      {
        itemId: 'baterias',
        label: 'Baterías',
        icon: 'batteryCharging',
        color: '#f97316',
        fact: 'Las baterías usadas deben desecharse aparte: contienen metales pesados contaminantes.',
      },
      {
        itemId: 'aceite',
        label: 'Aceite Usado',
        icon: 'fuel',
        color: '#0891b2',
        fact: 'Un litro de aceite usado puede contaminar hasta mil litros de agua si se vierte mal.',
      },
    ],
  },
  {
    slug: 'antivirus-caza-de-troyanos',
    id: 'seed-maze-antivirus-troyanos',
    title: 'Antivirus: Caza de Troyanos',
    description:
      'Controla un antivirus que recorre la red recolectando paquetes de datos seguros mientras esquiva troyanos maliciosos.',
    categoryName: 'Tecnología',
    categorySlug: 'tecnologia',
    theme: { primaryColor: '#3b82f6', coverImageUrl: null },
    config: {
      layout: 'CROSS',
      lives: 3,
      enemySpeed: 2,
      collectorLabel: 'Antivirus',
      collectorIcon: 'cpu',
      enemyLabel: 'Troyano',
      enemyIcon: 'zap',
    },
    content: [
      {
        itemId: 'paquete-datos',
        label: 'Paquete de Datos',
        icon: 'database',
        color: '#3b82f6',
        fact: 'Los datos viajan en paquetes pequeños que se reordenan al llegar a destino.',
      },
      {
        itemId: 'firewall',
        label: 'Firewall',
        icon: 'shieldCheck',
        color: '#22c55e',
        fact: 'Un firewall filtra el tráfico de red para bloquear accesos no autorizados.',
      },
      {
        itemId: 'actualizacion',
        label: 'Actualización de Seguridad',
        icon: 'lock',
        color: '#f59e0b',
        fact: 'Mantener el software actualizado corrige fallas de seguridad conocidas.',
      },
      {
        itemId: 'respaldo',
        label: 'Copia de Respaldo',
        icon: 'laptop',
        color: '#14b8a6',
        fact: 'Hacer copias de seguridad regulares protege tu información ante un ataque o falla.',
      },
      {
        itemId: 'conexion-segura',
        label: 'Conexión Segura',
        icon: 'wifi',
        color: '#06b6d4',
        fact: 'El cifrado HTTPS protege los datos que viajan entre tu dispositivo y un sitio web.',
      },
      {
        itemId: 'contrasena',
        label: 'Contraseña Cifrada',
        icon: 'key',
        color: '#8b5cf6',
        fact: 'Una contraseña fuerte combina letras, números y símbolos.',
      },
    ],
  },
];

async function ensureCategory(
  categories: import('mongodb').Collection,
  name: string,
  slug: string,
): Promise<string> {
  // Busca por nombre O por slug: si ya existe una categoría con este slug
  // pero un `name` que no calza exacto, buscar solo por `name` no la
  // encuentra y el insertOne de abajo revienta contra el índice único de
  // slug en vez de reusarla.
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

    for (const game of GAMES) {
      const categoryId = await ensureCategory(categories, game.categoryName, game.categorySlug);

      const document = {
        slug: game.slug,
        title: game.title,
        description: game.description,
        gameType: 'MAZE_COLLECTOR',
        theme: game.theme,
        categoryId,
        // Sin creador humano: es contenido del equipo, no de un usuario (mismo
        // criterio que seed-nexus-play.ts). Solo un ADMIN puede despublicarlo.
        creatorUserId: 'system',
        status: 'PUBLISHED',
        config: game.config,
        content: game.content,
        updatedAt: now,
      };

      const existing = await games.findOne({ slug: game.slug });
      if (existing) {
        await games.updateOne({ slug: game.slug }, { $set: document });
        console.log(`"${game.title}" actualizado (slug: ${game.slug}).`);
      } else {
        await games.insertOne({ _id: game.id, ...document, createdAt: now } as never);
        console.log(`"${game.title}" sembrado como juego PUBLISHED (slug: ${game.slug}).`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
