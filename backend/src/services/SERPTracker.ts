import { config } from '@/config/index.js';
import { PrismaClient, SeoMetric } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PositionResult {
  position: number;
  url: string | null;
  title: string | null;
}

export type MovementDirection = 'improved' | 'dropped' | 'maintained';

const RATE_LIMIT_MS = 86_400_000; // 24 hours

// ---------------------------------------------------------------------------
// SERPTracker
// ---------------------------------------------------------------------------

class SERPTracker {
  private prisma: PrismaClient;
  private lastCheck: Map<string, number>;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? new PrismaClient();
    this.lastCheck = new Map();
  }

  // -------------------------------------------------------------------------
  // Public – Position Checking
  // -------------------------------------------------------------------------

  /**
   * Search Google via SerpAPI (or simulation when the API key is absent) and
   * return the 1-based rank of the best-matching result.
   *
   * When `domain` is provided the search is scoped via `site:`, making this
   * a rank-tracker for a specific owned property.  Returns `position: 0` when
   * the keyword does not appear in the top 100 results or the API call fails.
   *
   * Rate-limited to one check per keyword per 24 hours; subsequent calls
   * return the last persisted SeoMetric position without hitting the wire.
   */
  async checkPosition(keyword: string, domain?: string): Promise<PositionResult> {
    // -- Rate limit: skip API call if checked within 24 hours ----------------
    const last = this.lastCheck.get(keyword);
    if (last && Date.now() - last < RATE_LIMIT_MS) {
      const lastMetric = await this.prisma.seoMetric.findFirst({
        where: { article: { keyword: { keyword } } },
        orderBy: { trackedAt: 'desc' },
      });
      if (lastMetric) {
        return {
          position: lastMetric.googlePosition ?? 0,
          url: null,
          title: null,
        };
      }
    }

    this.lastCheck.set(keyword, Date.now());

    // -- Dev-mode simulation when the API key is empty -----------------------
    if (!config.serpApiKey) {
      const position = (Math.abs(this.hashCode(keyword)) % 30) + 1;
      return {
        position,
        url: domain ? `https://${domain}/article/${keyword.replace(/\s+/g, '-')}` : null,
        title: null,
      };
    }

    // -- Live SerpAPI call ---------------------------------------------------
    try {
      const params: Record<string, string> = {
        api_key: config.serpApiKey,
        q: domain ? `site:${domain} ${keyword}` : keyword,
        num: '100',
        engine: 'google',
      };

      const url = new URL('https://serpapi.com/search.json');
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.warn(
          `[SERPTracker] SerpAPI returned HTTP ${response.status} for keyword "${keyword}"`,
        );
        return { position: 0, url: null, title: null };
      }

      const data: any = await response.json();

      if (data.error) {
        console.warn(`[SERPTracker] SerpAPI error for keyword "${keyword}": ${data.error}`);
        return { position: 0, url: null, title: null };
      }

      const results: any[] = data.organic_results ?? [];

      if (results.length === 0) {
        return { position: 0, url: null, title: null };
      }

      // When scoped to a domain find the first result whose link contains it;
      // otherwise return the top organic result.
      if (domain) {
        const lowerDomain = domain.toLowerCase();
        for (const result of results) {
          const link = (result.link ?? '').toLowerCase();
          if (link.includes(lowerDomain)) {
            return {
              position: result.position ?? 0,
              url: result.link ?? null,
              title: result.title ?? null,
            };
          }
        }
        return { position: 0, url: null, title: null };
      }

      // General keyword — return the top-ranked result
      const top = results[0];
      return {
        position: top.position ?? 0,
        url: top.link ?? null,
        title: top.title ?? null,
      };
    } catch (err) {
      console.warn(
        `[SERPTracker] Failed to check position for "${keyword}": ${(err as Error).message}`,
      );
      return { position: 0, url: null, title: null };
    }
  }

  // -------------------------------------------------------------------------
  // Public – Position History
  // -------------------------------------------------------------------------

  /**
   * Retrieve all SeoMetric records associated with articles targeting the
   * given keyword, ordered most-recent-first.
   *
   * Returns an empty array when the keyword has never been tracked.
   */
  async getPositionHistory(keywordId: string): Promise<SeoMetric[]> {
    return this.prisma.seoMetric.findMany({
      where: { article: { keywordId } },
      orderBy: { trackedAt: 'desc' },
    });
  }

  // -------------------------------------------------------------------------
  // Public – Movement Detection
  // -------------------------------------------------------------------------

  /**
   * Compare the two most recent SeoMetric records for a keyword and describe
   * the direction of movement.
   *
   * - 'improved'   – current position is lower (better) than the previous
   * - 'dropped'    – current position is higher (worse) than the previous
   * - 'maintained' – positions are equal or fewer than 2 records exist
   */
  async detectMovement(keywordId: string): Promise<MovementDirection> {
    const records = await this.prisma.seoMetric.findMany({
      where: { article: { keywordId } },
      orderBy: { trackedAt: 'desc' },
      take: 2,
    });

    if (records.length < 2) {
      return 'maintained';
    }

    const current = records[0].googlePosition ?? 0;
    const previous = records[1].googlePosition ?? 0;

    if (current < previous) {
      return 'improved';
    }
    if (current > previous) {
      return 'dropped';
    }
    return 'maintained';
  }

  // -------------------------------------------------------------------------
  // Public – Alert Threshold
  // -------------------------------------------------------------------------

  /**
   * Returns `true` when the keyword has dropped more than three positions
   * between the two supplied measurements, indicating a potential alert.
   *
   * Pure synchronous method — no database access.
   */
  alertOnDrop(_keyword: string, prevPosition: number, currentPosition: number): boolean {
    return currentPosition - prevPosition > 3;
  }

  // -------------------------------------------------------------------------
  // Private – Helpers
  // -------------------------------------------------------------------------

  /**
   * Simple string hash for deterministic dev-mode position generation.
   *
   * Port of Java's `String.hashCode()`: s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // convert to 32-bit integer
    }
    return hash;
  }
}

export default SERPTracker;
