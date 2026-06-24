import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../prisma/migrations');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[Migrate] DATABASE_URL is not set');
  process.exit(1);
}

async function main() {
  // Connect to Turso
  const db = createClient({
    url: DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Get all migration directories, sorted by timestamp (name)
  const dirs = fs.readdirSync(MIGRATIONS_DIR)
    .filter(d => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
    .sort();

  console.log(`[Migrate] Found ${dirs.length} migration(s) to check`);

  for (const dir of dirs) {
    const sqlFile = path.join(MIGRATIONS_DIR, dir, 'migration.sql');
    if (!fs.existsSync(sqlFile)) {
      console.log(`[Migrate] Skipping ${dir}: no migration.sql found`);
      continue;
    }

    const sql = fs.readFileSync(sqlFile, 'utf-8');
    console.log(`[Migrate] Running: ${dir}`);

    // Split SQL into individual statements and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await db.execute(stmt + ';');
      } catch (err: any) {
        // Ignore "already exists" errors since migrations may be partially applied
        if (err.message?.includes('already exists')) {
          console.log(`[Migrate]   (already applied) ${stmt.slice(0, 60)}...`);
        } else {
          throw err;
        }
      }
    }
    console.log(`[Migrate]   Done: ${dir}`);
  }

  console.log('[Migrate] All migrations applied successfully');
  db.close();
  process.exit(0);
}

main().catch(err => {
  console.error('[Migrate] Failed:', err.message);
  process.exit(1);
});
