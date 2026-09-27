import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * Siembra idempotente (upsert por `gameType`) de los 7 tipos de juego del
 * catálogo (`VALID_GAME_TYPES`, ver domain/value-objects/game-type.vo.ts) en
 * `game_type_settings`. `MAZE_COLLECTOR` y `DUAL_QUEST` nacen ARCHIVED por
 * decisión de producto (issue #156); el resto nace ACTIVE.
 *
 * Uso: npm run db:seed:game-type-settings
 */

interface GameTypeSeed {
  gameType: string;
  displayName: string;
  description: string;
  archived: boolean;
}

const GAME_TYPE_SEEDS: GameTypeSeed[] = [
  {
    gameType: 'MEMORY_MATCH',
    displayName: 'Memoria',
    description: 'Encuentra las parejas de cartas antes de que se acabe el tiempo.',
    archived: false,
  },
  {
    gameType: 'GUESS_WHO',
    displayName: '¿Quién es quién?',
    description: 'Adivina el personaje correcto haciendo preguntas de sí o no.',
    archived: false,
  },
  {
    gameType: 'DOMINO',
    displayName: 'Dominó',
    description: 'Encadena fichas relacionando sus dos extremos.',
    archived: false,
  },
  {
    gameType: 'MAZE_COLLECTOR',
    displayName: 'Recolector de laberinto',
    description: 'Recorre el laberinto recolectando elementos antes de llegar a la meta.',
    archived: true,
  },
  {
    gameType: 'SNAKES_LADDERS',
    displayName: 'Serpientes y escaleras',
    description: 'Avanza por el tablero respondiendo preguntas, sube por escaleras y evita las serpientes.',
    archived: false,
  },
  {
    gameType: 'DUAL_QUEST',
    displayName: 'Fuego y Agua',
    description: 'Juego cooperativo donde dos jugadores avanzan juntos resolviendo retos complementarios.',
    archived: true,
  },
  {
    gameType: 'DUAL_QUEST_PIXI',
    displayName: 'Fuego y Agua (Pixi)',
    description: 'Versión con motor gráfico Pixi del cooperativo Fuego y Agua.',
    archived: false,
  },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    for (const seed of GAME_TYPE_SEEDS) {
      await prisma.gameTypeSettingModel.upsert({
        where: { gameType: seed.gameType },
        create: {
          gameType: seed.gameType,
          displayName: seed.displayName,
          description: seed.description,
          status: seed.archived ? 'ARCHIVED' : 'ACTIVE',
          archivedAt: seed.archived ? new Date() : null,
          archivedByUserId: null,
        },
        update: {},
      });
    }
    console.log(
      'game_type_settings sembrados:',
      GAME_TYPE_SEEDS.map((s) => s.gameType).join(', '),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
