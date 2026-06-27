import { PrismaClient } from '@prisma/client';

// Append connect_timeout=10 to the database URL so Prisma never hangs
// indefinitely when the database is unreachable.
function ensureConnectionTimeout(url: string): string {
  const param = 'connect_timeout=10';
  return url.includes('?') ? `${url}&${param}` : `${url}?${param}`;
}

const rawUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/sporty';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: ensureConnectionTimeout(rawUrl),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export default prisma;
