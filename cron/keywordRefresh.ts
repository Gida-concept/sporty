import prisma from '../backend/src/lib/prisma.js';
import { config } from '../backend/src/config/index.js';
import SerpAPI from '../backend/src/lib/SerpAPI.js';
import KeywordMatrix from '../backend/src/services/KeywordMatrix.js';
import type { CronResult, CronOptions } from './types.js';

const MAX_NEW_KEYWORDS = 20;

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    const serpAPI = new SerpAPI();
    const keywordMatrix = new KeywordMatrix(serpAPI, prisma);

    // Get top trends to use as head terms
    const topTrends = await prisma.trend.findMany({
      where: { processed: false },
      orderBy: { trendScore: 'desc' },
      take: 5,
      include: { category: true },
    });

    const generated: string[] = [];

    for (const trend of topTrends) {
      const headTerm = trend.query;
      const keywords = await keywordMatrix.generateFromHeadTerm(
        headTerm,
        trend.category?.name || 'sports',
      );
      const validated = await keywordMatrix.validateWithSerpAPI(keywords);
      const scored = keywordMatrix.scoreAndRank(validated);

      if (!dryRun && scored.length > 0) {
        // Mark trend as processed
        await prisma.trend.update({
          where: { id: trend.id },
          data: { processed: true },
        });
      }

      generated.push(
        ...scored.slice(0, MAX_NEW_KEYWORDS / topTrends.length).map((k: any) => k.keyword),
      );
    }

    return {
      success: true,
      exitCode: 0,
      message: `Generated ${generated.length} keywords from ${topTrends.length} trends${dryRun ? ' (dry-run)' : ''}`,
      details: { keywordCount: generated.length, trendCount: topTrends.length, dryRun },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Keyword refresh failed: ${message}`,
      details: { error: message },
    };
  }
}
