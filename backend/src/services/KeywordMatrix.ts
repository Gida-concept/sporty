import { config } from '@/config/index.js';
import { AppError } from '@/middleware/errorHandler.js';
import SerpAPI, { KeywordData, RelatedSearch } from '@/lib/SerpAPI.js';
import { PrismaClient, Keyword as PrismaKeyword, Trend } from '@prisma/client';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type IntentType = 'informational' | 'commercial' | 'transactional' | 'news' | 'navigational';

type IntentMultipliers = Record<IntentType, number>;

const INTENT_MULTIPLIERS: IntentMultipliers = {
  informational: 1.0,
  commercial: 1.5,
  transactional: 2.0,
  news: 1.3,
  navigational: 0.5,
};

/* ------------------------------------------------------------------ */
/*  Modifier Pools                                                    */
/* ------------------------------------------------------------------ */

const SPORTS_MODIFIERS = [
  'stats',
  'contract',
  'injury update',
  'vs rival',
  'net worth 2026',
  'draft',
  'trade rumors',
  'playoff chances',
  'fantasy value',
  'betting odds',
  'career milestones',
  'team news',
  'highlights',
  'predictions',
] as const;

const ENTERTAINMENT_MODIFIERS = [
  'net worth',
  'dating',
  'movies 2026',
  'red carpet',
  'controversy',
  'interview',
  'fashion',
  'tour dates',
  'streaming',
  'box office',
  'awards predictions',
  'behind the scenes',
  'feud',
  'collaboration',
] as const;

const MODIFIER_POOLS: Record<string, readonly string[]> = {
  sports: SPORTS_MODIFIERS,
  entertainment: ENTERTAINMENT_MODIFIERS,
};

/* ------------------------------------------------------------------ */
/*  Intent Detection                                                  */
/* ------------------------------------------------------------------ */

const INTENT_MAP: Record<string, IntentType> = {
  stats: 'informational',
  contract: 'commercial',
  'injury update': 'news',
  'vs rival': 'informational',
  'net worth 2026': 'commercial',
  draft: 'news',
  'trade rumors': 'news',
  'playoff chances': 'informational',
  'fantasy value': 'transactional',
  'betting odds': 'transactional',
  'career milestones': 'informational',
  'team news': 'news',
  highlights: 'informational',
  predictions: 'informational',
  'net worth': 'commercial',
  dating: 'informational',
  'movies 2026': 'informational',
  'red carpet': 'news',
  controversy: 'news',
  interview: 'informational',
  fashion: 'commercial',
  'tour dates': 'transactional',
  streaming: 'transactional',
  'box office': 'informational',
  'awards predictions': 'informational',
  'behind the scenes': 'informational',
  feud: 'news',
  collaboration: 'informational',
};

function detectIntent(modifier: string): IntentType {
  return INTENT_MAP[modifier] ?? 'informational';
}

/* ------------------------------------------------------------------ */
/*  CategoryId cache helper                                           */
/* ------------------------------------------------------------------ */

async function resolveCategoryId(prisma: PrismaClient, slug: string): Promise<string> {
  const record = await prisma.category.findUnique({ where: { slug } });
  if (!record) {
    throw new AppError('E005', `Category '${slug}' not found`);
  }
  return record.id;
}

/* ------------------------------------------------------------------ */
/*  KeywordMatrix Service                                             */
/* ------------------------------------------------------------------ */

class KeywordMatrix {
  private prisma: PrismaClient;
  private serpAPI: SerpAPI;

  constructor(serpAPI: SerpAPI, prisma?: PrismaClient) {
    this.serpAPI = serpAPI;
    this.prisma = prisma ?? new PrismaClient();
  }

  /**
   * Generate keywords by combining a head term with every modifier in
   * the category's modifier pool, then upsert them into the Keyword table.
   */
  async generateFromHeadTerm(headTerm: string, category: string): Promise<PrismaKeyword[]> {
    const modifiers = MODIFIER_POOLS[category] ?? MODIFIER_POOLS['sports'];
    const categoryId = await resolveCategoryId(this.prisma, category);

    const keywords: PrismaKeyword[] = [];

    for (const modifier of modifiers) {
      const keyword = `${headTerm} ${modifier}`;
      const intent = detectIntent(modifier);

      const record = await this.prisma.keyword.upsert({
        where: { keyword },
        create: {
          keyword,
          headTerm,
          modifier,
          categoryId,
          intent,
          status: 'pending',
        },
        update: {
          headTerm,
          modifier,
          categoryId,
          intent,
          status: 'pending',
        },
      });

      keywords.push(record);
    }

    return keywords;
  }

  /**
   * Enrich keywords with SerpAPI search-volume, difficulty, and CPC data.
   * Individual failures are swallowed so one bad keyword does not block the
   * rest of the batch.
   */
  async validateWithSerpAPI(keywords: PrismaKeyword[]): Promise<PrismaKeyword[]> {
    const results = await Promise.allSettled(
      keywords.map(async (kw) => {
        const data: KeywordData = await this.serpAPI.getKeywordData(kw.keyword);

        return this.prisma.keyword.update({
          where: { id: kw.id },
          data: {
            searchVolume: data.totalResults ?? 0,
            difficulty: data.keywordDifficulty ?? 0,
            cpc: data.cpc ?? 0,
            lastValidatedAt: new Date(),
            status: 'validated',
          },
        });
      }),
    );

    const updated: PrismaKeyword[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        updated.push(result.value);
      } else {
        console.warn(`[KeywordMatrix] SerpAPI validation failed for a keyword: ${result.reason}`);
      }
    }

    return updated;
  }

  /**
   * Score each keyword using a weighted priority formula and persist the
   * scores. Returns keywords sorted by priorityScore descending.
   *
   * Priority = (searchVolume / max(difficulty, 1)) * (cpc || 0.5) * intentMultiplier
   */
  scoreAndRank(keywords: PrismaKeyword[]): PrismaKeyword[] {
    const scored = keywords.map((kw) => {
      const volume = kw.searchVolume ?? 0;
      const difficulty = Math.max(kw.difficulty ?? 1, 1);
      const cpc = kw.cpc ?? 0.5;
      const intent = (kw.intent as IntentType) ?? 'informational';
      const multiplier = INTENT_MULTIPLIERS[intent];

      const priorityScore = (volume / difficulty) * (cpc || 0.5) * multiplier;

      return { ...kw, priorityScore };
    });

    // Persist the computed score
    void Promise.all(
      scored.map((kw) =>
        this.prisma.keyword.update({
          where: { id: kw.id },
          data: { priorityScore: kw.priorityScore },
        }),
      ),
    ).catch((err) =>
      console.warn(`[KeywordMatrix] Failed to persist priorityScore for some keywords: ${err}`),
    );

    return scored.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Given a trend, return the single highest-scoring pending keyword,
   * or null if no keywords are available.
   */
  async getWinningKeyword(trendData: Trend): Promise<PrismaKeyword | null> {
    const categoryId = trendData.categoryId;
    if (!categoryId) return null;

    const pending = await this.prisma.keyword.findMany({
      where: { categoryId, status: 'pending' },
    });

    if (pending.length === 0) return null;

    const ranked = this.scoreAndRank(pending);
    return ranked[0] ?? null;
  }

  /**
   * Fetch pending keywords ordered by priority, up to the given limit.
   */
  async getPendingKeywords(limit: number = 10): Promise<PrismaKeyword[]> {
    return this.prisma.keyword.findMany({
      where: { status: 'pending' },
      orderBy: { priorityScore: 'desc' },
      take: limit,
    });
  }

  /**
   * Update the status of a single keyword.
   */
  async updateStatus(keywordId: string, status: string): Promise<void> {
    await this.prisma.keyword.update({
      where: { id: keywordId },
      data: { status },
    });
  }
}

export default KeywordMatrix;
