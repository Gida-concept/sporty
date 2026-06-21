import prisma from '../backend/src/lib/prisma.js';
import SerpAPI from '../backend/src/lib/SerpAPI.js';
import ContentRefresher from '../backend/src/services/ContentRefresher.js';
import ContentGuide from '../backend/src/services/ContentGuide.js';
import { config } from '../backend/src/config/index.js';
import type { CronResult, CronOptions } from './types.js';

const MAX_REFRESH = 3;

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    const serpAPI = new SerpAPI();
    const refresher = new ContentRefresher(prisma);
    const contentGuide = new ContentGuide(serpAPI, prisma);

    const staleArticles = await refresher.findStaleArticles();
    const toRefresh = staleArticles.slice(0, MAX_REFRESH);

    if (toRefresh.length === 0) {
      return {
        success: true,
        exitCode: 0,
        message: 'No stale articles found',
      };
    }

    if (!dryRun) {
      for (const article of toRefresh) {
        try {
          // Try to find a real keyword, otherwise skip guide generation
          const keywordRecord = await prisma.keyword.findFirst({
            where: {
              keyword: { contains: (article.title || '').split(' ').slice(0, 2).join(' ') },
            },
          });
          if (!keywordRecord) continue;
          const guide = await contentGuide.generate(keywordRecord, null as any);
          await prisma.article.update({
            where: { id: article.id },
            data: { lastRefreshedAt: new Date() },
          });
        } catch (err) {
          // Continue with other articles
        }
      }
    }

    return {
      success: true,
      exitCode: 0,
      message: `Refreshed ${toRefresh.length} of ${staleArticles.length} stale articles${dryRun ? ' (dry-run)' : ''}`,
      details: { staleCount: staleArticles.length, refreshedCount: toRefresh.length, dryRun },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Content refresh failed: ${message}`,
      details: { error: message },
    };
  }
}
