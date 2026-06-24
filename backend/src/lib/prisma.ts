import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import type { Config } from '@libsql/client';

function createPrismaClient(): PrismaClient {
  const config: Config = {
    url: process.env.DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN,
  };

  const adapter = new PrismaLibSQL(config);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const prisma = createPrismaClient();
export default prisma;
