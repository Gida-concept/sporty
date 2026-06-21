import prisma from '../backend/src/lib/prisma.js';
import { config } from '../backend/src/config/index.js';
import SerpAPI from '../backend/src/lib/SerpAPI.js';
import TrendFinder from '../backend/src/services/TrendFinder.js';
import { cache } from '../backend/src/lib/cache.js';
import type { CronResult, CronOptions } from './types.js';

const DEFAULT_GEOS = ['us', 'gb'];
const TREND_RETENTION_DAYS = 7;

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  // Early-exit if SerpAPI quota is insufficient
  if (!cache.canMakeRequest()) {
    console.log('[trendMonitor] SerpAPI quota insufficient — skipping');
    return {
      success: true,
      exitCode: 0,
      message: 'Skipped — SerpAPI quota insufficient',
      details: { quotaExceeded: true },
    };
  }

  const serpAPI = new SerpAPI();
  const trendFinder = new TrendFinder(serpAPI, prisma);

  try {
    const allTrends: Array<{ query: string; score: number; category: string; geo: string }> = [];

    for (const geo of DEFAULT_GEOS) {
      const trends = await trendFinder.discover('sports,entertainment', [geo]);
      allTrends.push(
        ...trends.map((t: any) => ({
          query: t.query || t.title,
          score: t.trendScore || 0,
          category: t.category || 'general',
          geo,
        })),
      );
    }

    if (!dryRun && allTrends.length > 0) {
      // Prune old trends
      const cutoff = new Date(Date.now() - TREND_RETENTION_DAYS * 86400000);
      await prisma.trend.deleteMany({ where: { fetchedAt: { lt: cutoff } } });
    }

    return {
      success: true,
      exitCode: 0,
      message: `Discovered ${allTrends.length} trends across ${DEFAULT_GEOS.length} geos${dryRun ? ' (dry-run)' : ''}`,
      details: { trendCount: allTrends.length, geos: DEFAULT_GEOS, dryRun },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Trend monitor failed: ${message}`,
      details: { error: message },
    };
  }
}
