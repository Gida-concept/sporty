import { PrismaClient } from '@prisma/client';

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  client.$connect()
    .then(() => {
      // WAL mode allows concurrent reads while writing — critical for high-traffic
      client.$executeRawUnsafe('PRAGMA journal_mode=WAL');
      // 5-second busy timeout so concurrent writes don't fail immediately
      client.$executeRawUnsafe('PRAGMA busy_timeout=5000');
    })
    .catch((err) => {
      console.error('[Prisma] Failed to connect:', err);
    });

  return client;
}

const prisma = createPrismaClient();
export default prisma;
