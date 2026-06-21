import prisma from '../backend/src/lib/prisma.js';
import LinkManager from '../backend/src/services/LinkManager.js';
import type { CronResult, CronOptions } from './types.js';

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    const linkManager = new LinkManager(prisma);
    const articles = await prisma.article.findMany({
      where: { status: 'published' },
      select: { slug: true, title: true, contentHtml: true, id: true },
    });

    if (!dryRun) {
      for (const article of articles) {
        try {
          await linkManager.rebuildLinkGraph([article] as any[]);
        } catch {
          // Continue with next article
        }
      }
    }

    return {
      success: true,
      exitCode: 0,
      message: `Link graph rebuilt for ${articles.length} articles${dryRun ? ' (dry-run)' : ''}`,
      details: { articleCount: articles.length, dryRun },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Link update failed: ${message}`,
      details: { error: message },
    };
  }
}
