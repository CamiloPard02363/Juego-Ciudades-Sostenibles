import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const VALID_ROLE_NAMES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    for (const name of VALID_ROLE_NAMES) {
      await prisma.roleModel.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }
    console.log('Roles sembrados:', VALID_ROLE_NAMES.join(', '));
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
