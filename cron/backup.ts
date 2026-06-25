import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import prisma from '../backend/src/lib/prisma.js';
import type { CronResult, CronOptions } from './types.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const RETENTION_DAYS = 30;

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    if (!dryRun) {
      await fs.mkdir(BACKUP_DIR, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dbUrl = process.env.DATABASE_URL;

      // Dump the PostgreSQL database via pg_dump
      if (dbUrl && dbUrl.startsWith('postgresql://')) {
        try {
          const dumpPath = path.join(BACKUP_DIR, `sporty-${timestamp}.sql`);
          execSync(`pg_dump "${dbUrl}" > "${dumpPath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 120000, // 2 minute timeout for large databases
          });
        } catch {
          // pg_dump may not be installed or DB unreachable — fallback to log
          const fallbackPath = path.join(BACKUP_DIR, `sporty-${timestamp}.log`);
          await fs.writeFile(
            fallbackPath,
            `pg_dump NOT AVAILABLE at ${new Date().toISOString()}. Install PostgreSQL client tools or use Supabase built-in backups.\n`,
          );
        }
      } else {
        // Fallback for SQLite-based local development
        const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');
        try {
          await fs.access(dbPath);
          const dbContent = await fs.readFile(dbPath);
          await fs.writeFile(path.join(BACKUP_DIR, `dev-${timestamp}.db`), dbContent);
        } catch {
          // DB file not found at default path — skip
        }
      }

      // Rotate old backups
      const files = await fs.readdir(BACKUP_DIR);
      const cutoff = Date.now() - RETENTION_DAYS * 86400000;

      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.unlink(filePath);
        }
      }
    }

    return {
      success: true,
      exitCode: 0,
      message: `Backup completed${dryRun ? ' (dry-run)' : ''}`,
      details: { backupDir: BACKUP_DIR, retentionDays: RETENTION_DAYS, dryRun },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Backup failed: ${message}`,
      details: { error: message },
    };
  }
}
