import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import SerpAPI, { TrendingNowResult } from '../lib/SerpAPI.js';
import { PrismaClient, Trend } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  volume: number;
  growthRate: number;
  recency: number;
  geoRelevance: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  volume: 0.4,
  growthRate: 0.3,
  recency: 0.2,
  geoRelevance: 0.1,
};

const DEFAULT_GEOS = ['us', 'gb', 'ca', 'au'];
const MIN_SEARCH_VOLUME = 300;

// ---------------------------------------------------------------------------
// TrendFinder
// ---------------------------------------------------------------------------

class TrendFinder {
  private serpAPI: SerpAPI;
  private prisma: PrismaClient;

  constructor(serpAPI: SerpAPI, prisma: PrismaClient) {
    this.serpAPI = serpAPI;
    this.prisma = prisma;
  }

  /**
   * Check whether any article published in the last 14 days already covers
   * the given query (by word-overlap in title/slug).
   */
  async isAlreadyCovered(query: string): Promise<boolean> {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return false;

    const recentArticles = await this.prisma.article.findMany({
      where: { publishedAt: { gte: new Date(Date.now() - 14 * 86400000) } },
      select: { title: true, slug: true },
    });

    for (const article of recentArticles) {
      const matched = words.filter(w =>
        article.title.toLowerCase().includes(w) ||
        article.slug.toLowerCase().includes(w)
      ).length;
      if (matched >= Math.ceil(words.length / 2)) return true;
    }
    return false;
  }

  /**
   * Fetch trending searches from SerpAPI across multiple geos, score each
   * trend, and persist to the database.
   */
  async discover(category: string, geos: string[] = DEFAULT_GEOS): Promise<Trend[]> {
    const allTrends: TrendingNowResult[] = [];

    for (const geo of geos) {
      try {
        const trends = await this.serpAPI.getTrendingNow(geo);
        allTrends.push(...trends);
      } catch (err) {
        console.warn(
          `[TrendFinder] Failed to fetch trends for geo ${geo}: ${(err as Error).message}`,
        );
      }
    }

    if (allTrends.length === 0) {
      throw new AppError('E002', 'No trending searches found from any geo', 502);
    }

    // Support comma-separated category slugs (e.g. "sports,entertainment")
    const categorySlugs = category.split(',').map(s => s.trim()).filter(Boolean);
    const categoryRecords = await this.prisma.category.findMany({
      where: { slug: { in: categorySlugs } },
    });

    if (categoryRecords.length === 0) {
      throw new AppError('E005', `No categories found for: '${category}'`, 400);
    }

    // Warn if some requested categories weren't found
    const foundSlugs = new Set(categoryRecords.map(c => c.slug));
    for (const slug of categorySlugs) {
      if (!foundSlugs.has(slug)) {
        console.warn(`[TrendFinder] Category '${slug}' not found (configured in DB?)`);
      }
    }

    const savedTrends: Trend[] = [];

    for (const item of allTrends) {
      if (item.volume < MIN_SEARCH_VOLUME) continue;

      const isCovered = await this.isAlreadyCovered(item.query);
      if (isCovered) continue;

      const score = this.serpAPI.scoreTrendingNow(item);

      const normalizedQuery = item.query
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim();

      for (const categoryRecord of categoryRecords) {
        const existing = await this.prisma.trend.findFirst({
          where: { normalizedQuery, categoryId: categoryRecord.id },
        });

        if (existing) {
          const updated = await this.prisma.trend.update({
            where: { id: existing.id },
            data: {
              searchVolume: item.volume,
              geo: item.geo ?? null,
              trendScore: score,
              fetchedAt: new Date(),
            },
          });
          savedTrends.push(updated);
        } else {
          const created = await this.prisma.trend.create({
            data: {
              query: item.query,
              normalizedQuery,
              categoryId: categoryRecord.id,
              searchVolume: item.volume,
              geo: item.geo ?? null,
              trendScore: score,
            },
          });
          savedTrends.push(created);
        }
      }
    }

    return savedTrends;
  }

  /**
   * Filter a list of trends to only those fetched within the last N hours.
   */
  filterByRecency(trends: Trend[], hours: number): Trend[] {
    const cutoff = new Date(Date.now() - hours * 3_600_000);
    return trends.filter((t) => new Date(t.fetchedAt) >= cutoff);
  }

  /**
   * Compute a composite score for a trend candidate.
   *
   * Score = (Volume / 10K) * volumeWeight + (GrowthRate / 100) * growthWeight
   *         + recency * recencyWeight + geoBias * geoWeight
   *
   * Recency decays linearly over 48 hours. Geo relevance defaults to 0.5.
   */
  calculateScore(trend: Partial<Trend>, weights?: ScoringWeights): number {
    const w = weights ?? DEFAULT_WEIGHTS;

    const volumeNorm = Math.min((trend.searchVolume ?? 0) / 10_000, 1);
    const growthNorm = Math.min((trend.growthRate ?? 0) / 100, 1);

    const ageMs = trend.fetchedAt ? Date.now() - new Date(trend.fetchedAt).getTime() : 0;
    const recencyNorm = Math.max(0, 1 - ageMs / (48 * 3_600_000));

    const geoRelevance = 0.5;

    return (
      volumeNorm * w.volume +
      growthNorm * w.growthRate +
      recencyNorm * w.recency +
      geoRelevance * w.geoRelevance
    );
  }

  /**
   * Query the database for the top N unprocessed trends, optionally filtered
   * by category slug.
   */
  async getTopTopics(limit: number = 10, category?: string): Promise<Trend[]> {
    const where: { processed: boolean; categoryId?: string } = { processed: false };

    if (category) {
      const cat = await this.prisma.category.findUnique({ where: { slug: category } });
      if (cat) {
        where.categoryId = cat.id;
      }
    }

    return this.prisma.trend.findMany({
      where,
      orderBy: { trendScore: 'desc' },
      take: limit,
      include: { category: true },
    });
  }
}

export default TrendFinder;
