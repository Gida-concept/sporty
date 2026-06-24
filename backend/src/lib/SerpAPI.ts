import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { cache } from './cache.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrendingResult {
  query: string;
  volume: number;
  geo: string;
}

export interface TrendingNowResult {
  query: string;
  volume: number;
  increasePercentage: number;
  geo: string;
  active: boolean;
  category: string;
  startTimestamp?: string;
  articles?: Array<{ title: string; source: string; url: string }>;
}

export interface RelatedSearch {
  query: string;
}

export interface KeywordData {
  totalResults: number;
  keywordDifficulty: number;
  cpc: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface RelatedQuestion {
  question: string;
  snippet: string;
  url: string;
}

export interface NewsResult {
  title: string;
  source: string;
  date: string;
  snippet: string;
  url: string;
}

export interface AnswerBox {
  title: string;
  answer: string;
  source: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'https://serpapi.com';
const DEFAULT_GEO = 'us';

/**
 * Tiered TTLs in seconds. Each method gets its own TTL; unmatched methods fall
 * back to DEFAULT_TTL_SECONDS.
 */
const TTL_SECONDS: Record<string, number> = {
  getNewsResults: 3600, // 1 hour
  getKeywordData: 86400, // 24 hours
  getSearchResults: 604800, // 7 days
  getTrendingSearches: 10800, // 3 hours
  getTrendingNow: 3600, // 1 hour
  getRelatedSearches: 604800,
  getRelatedQuestions: 604800,
  getAnswerBox: 604800,
};
const DEFAULT_TTL_SECONDS = 3600;

/**
 * Map ISO 3166-1 alpha-2 geo codes to Google search domains.
 */
const GEO_DOMAIN: Record<string, string> = {
  us: 'google.com',
  gb: 'google.co.uk',
  ca: 'google.ca',
  au: 'google.com.au',
  in: 'google.co.in',
  de: 'google.de',
  fr: 'google.fr',
  es: 'google.es',
  it: 'google.it',
  br: 'google.com.br',
  mx: 'google.com.mx',
  jp: 'google.co.jp',
};

/**
 * Parse a human-readable volume string (e.g. "100K+", "1.5M") into a number.
 */
function parseVolume(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[+,]/g, '').trim().toUpperCase();
  if (cleaned.endsWith('M')) {
    return Math.round(parseFloat(cleaned) * 1_000_000);
  }
  if (cleaned.endsWith('K')) {
    return Math.round(parseFloat(cleaned) * 1_000);
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// ---------------------------------------------------------------------------
// SerpAPI Client
// ---------------------------------------------------------------------------

class SerpAPI {
  // -------------------------------------------------------------------------
  // Public – Trending Searches
  // -------------------------------------------------------------------------

  /**
   * Fetch current trending searches from Google Trends.
   */
  async getTrendingSearches(geo?: string): Promise<TrendingResult[]> {
    const g = geo || DEFAULT_GEO;
    const data = await this._fetchWithCache('getTrendingSearches', '/trending_searches.json', {
      api_key: config.serpApiKey,
      engine: 'google_trends',
      q: 'sports',
      google_domain: GEO_DOMAIN[g] || 'google.com',
    });

    const items = data.trending_searches;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('E002', 'SerpAPI empty results', 502);
    }

    return items.map((item: any) => ({
      query: item.query || '',
      volume: parseVolume(item.volume),
      geo: g,
    }));
  }

  // -------------------------------------------------------------------------
  // Public – Trending Now (Google Trends Trending Now feed)
  // -------------------------------------------------------------------------

  /**
   * Fetch the current "Trending Now" feed from Google Trends.
   * Returns an empty array on transient errors; throws on quota/API errors.
   */
  async getTrendingNow(geo?: string): Promise<TrendingNowResult[]> {
    const g = geo || 'us';
    try {
      const data = await this._fetchWithCache('getTrendingNow', '/search.json', {
        api_key: config.serpApiKey,
        engine: 'google_trends_trending_now',
        geo: g,
        hours: '4',
        only_active: 'true',
      });

      const items = data.trending_searches;
      if (!items || !Array.isArray(items)) return [];

      return items
        .filter((item: any) => (item.search_volume || 0) >= 500)
        .map((item: any) => ({
          query: item.query || '',
          volume: item.search_volume || 0,
          increasePercentage: item.increase_percentage || 0,
          geo: g,
          active: item.active ?? true,
          category: item.categories?.[0]?.name || 'general',
          startTimestamp: item.start_timestamp || undefined,
          articles: Array.isArray(item.articles)
            ? item.articles.map((a: any) => ({
                title: a.title || '',
                source: a.source || '',
                url: a.link || '',
              }))
            : undefined,
        }));
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn(`[SerpAPI] getTrendingNow failed: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Score a trending-now result based on volume and surge percentage.
   * Returns a 0–10 score suitable for ranking.
   */
  scoreTrendingNow(trend: { volume: number; increasePercentage: number }): number {
    const volumeScore = Math.log10(Math.max(trend.volume, 1)) / 6;
    const surgeScore = Math.min(trend.increasePercentage / 1000, 10);
    return volumeScore * 0.4 + surgeScore * 0.6;
  }

  // -------------------------------------------------------------------------
  // Public – Related Searches
  // -------------------------------------------------------------------------

  /**
   * Fetch related searches for a given query.
   */
  async getRelatedSearches(query: string, geo?: string): Promise<RelatedSearch[]> {
    const data = await this._fetchWithCache('getRelatedSearches', '/search.json', {
      api_key: config.serpApiKey,
      q: query,
      gl: geo || DEFAULT_GEO,
      engine: 'google',
    });

    const items = data.related_searches;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('E002', 'SerpAPI empty results', 502);
    }

    return items.map((item: any) => ({
      query: typeof item === 'string' ? item : item.query || '',
    }));
  }

  // -------------------------------------------------------------------------
  // Public – Keyword Data
  // -------------------------------------------------------------------------

  /**
   * Fetch keyword-level data (total results, difficulty, CPC) for a query.
   */
  async getKeywordData(query: string, geo?: string): Promise<KeywordData> {
    const data = await this._fetchWithCache('getKeywordData', '/search.json', {
      api_key: config.serpApiKey,
      q: query,
      gl: geo || DEFAULT_GEO,
      engine: 'google',
    });

    const searchInfo = data.search_information || {};
    const keywordProps = data.keyword_props || {};

    const totalResultsStr = String(searchInfo.total_results || '0').replace(/[,.]/g, '');
    const totalResults = parseInt(totalResultsStr, 10) || 0;

    return {
      totalResults,
      keywordDifficulty:
        typeof keywordProps.keyword_difficulty === 'number' ? keywordProps.keyword_difficulty : 0,
      cpc: typeof keywordProps.cpc === 'number' ? keywordProps.cpc : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Public – Search Results (organic)
  // -------------------------------------------------------------------------

  /**
   * Fetch top organic search results for a query.
   */
  async getSearchResults(query: string, geo?: string, num?: number): Promise<SearchResult[]> {
    const params: Record<string, string> = {
      api_key: config.serpApiKey,
      q: query,
      gl: geo || DEFAULT_GEO,
      engine: 'google',
    };
    if (num !== undefined) {
      params.num = String(num);
    }

    const data = await this._fetchWithCache('getSearchResults', '/search.json', params);

    const items = data.organic_results;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('E002', 'SerpAPI empty results', 502);
    }

    return items.map((item: any) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
      position: item.position ?? 0,
    }));
  }

  // -------------------------------------------------------------------------
  // Public – Related Questions (PAA)
  // -------------------------------------------------------------------------

  /**
   * Fetch "People Also Ask" questions for a query.
   */
  async getRelatedQuestions(query: string, geo?: string): Promise<RelatedQuestion[]> {
    const data = await this._fetchWithCache('getRelatedQuestions', '/search.json', {
      api_key: config.serpApiKey,
      q: query,
      gl: geo || DEFAULT_GEO,
      engine: 'google',
    });

    const items = data.related_questions;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('E002', 'SerpAPI empty results', 502);
    }

    return items.map((item: any) => ({
      question: item.question || '',
      snippet: item.snippet || '',
      url: item.link || '',
    }));
  }

  // -------------------------------------------------------------------------
  // Public – News Results
  // -------------------------------------------------------------------------

  /**
   * Fetch news results for a query (tbm=nws).
   */
  async getNewsResults(query: string, geo?: string): Promise<NewsResult[]> {
    const data = await this._fetchWithCache('getNewsResults', '/search.json', {
      api_key: config.serpApiKey,
      q: query,
      gl: geo || DEFAULT_GEO,
      tbm: 'nws',
      num: '10',
      engine: 'google',
    });

    const items = data.news_results;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('E002', 'SerpAPI empty results', 502);
    }

    return items.map((item: any) => ({
      title: item.title || '',
      source: item.source || '',
      date: item.date || '',
      snippet: item.snippet || '',
      url: item.link || '',
    }));
  }

  // -------------------------------------------------------------------------
  // Public – Answer Box (Featured Snippet)
  // -------------------------------------------------------------------------

  /**
   * Fetch the featured snippet / answer box for a query.
   *
   * Returns `null` when no answer box is present — unlike the other search
   * methods this does **not** throw on empty, because answer boxes are
   * naturally absent for many queries.
   */
  async getAnswerBox(query: string, geo?: string): Promise<AnswerBox | null> {
    const data = await this._fetchWithCache('getAnswerBox', '/search.json', {
      api_key: config.serpApiKey,
      q: query,
      gl: geo || DEFAULT_GEO,
      engine: 'google',
    });

    const box = data.answer_box;
    if (!box) return null;

    return {
      title: box.title || '',
      answer: box.answer || box.snippet || '',
      source: box.source || '',
      url: box.link || '',
    };
  }

  // -------------------------------------------------------------------------
  // Private – Cache
  // -------------------------------------------------------------------------

  /**
   * Return cached data when fresh, otherwise fetch via `_fetch` and store.
   */
  private async _fetchWithCache(
    method: string,
    endpoint: string,
    params: Record<string, string>,
  ): Promise<any> {
    const key = `${method}:${JSON.stringify(params)}`;

    const cached = cache.get<any>(key);
    if (cached !== null) return cached;

    const data = await this._fetch(endpoint, params);

    const ttl = (TTL_SECONDS[method] ?? DEFAULT_TTL_SECONDS) * 1000;
    cache.set(key, data, ttl);

    return data;
  }

  // -------------------------------------------------------------------------
  // Private – HTTP layer with exponential backoff
  // -------------------------------------------------------------------------

  /**
   * Perform an HTTP GET request to the SerpAPI endpoint.
   *
   * Checks quota limits before making the request.
   * Retries up to 3 times with exponential backoff (1 s, 2 s, 4 s) on
   * rate-limits (429) and server errors (5xx).  Maps non-retryable HTTP
   * errors to typed AppError instances.
   */
  private async _fetch(endpoint: string, params: Record<string, string>): Promise<any> {
    // ── Quota check ──────────────────────────────────────────────────
    if (!cache.canMakeRequest()) {
      console.warn('[SerpAPI] Quota limit reached (daily or monthly). Skipping request.');
      throw new AppError('E001', 'SerpAPI quota limit reached', 429);
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url.toString());

        if (response.ok) {
          const data: any = await response.json();

          if (data.error) {
            this._throwForApiError(data.error, response.status);
          }

          // Track successful API usage
          cache.incrementUsage();

          return data;
        }

        // ── Non-retryable ─────────────────────────────────────────────
        if (response.status === 401) {
          throw new AppError('E010', 'Invalid SerpAPI key', 401);
        }

        // ── Retryable (429) ───────────────────────────────────────────
        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            console.warn(
              `[SerpAPI] Rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.pow(2, attempt)} s...`,
            );
            await this._sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          throw new AppError('E001', 'SerpAPI rate limit reached', 429);
        }

        // ── Retryable (5xx) ──────────────────────────────────────────
        if (response.status >= 500) {
          if (attempt < MAX_RETRIES) {
            console.warn(
              `[SerpAPI] Server error ${response.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.pow(2, attempt)} s...`,
            );
            await this._sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
          throw new AppError('E002', `SerpAPI server error: HTTP ${response.status}`, 502);
        }

        // ── Other 4xx ────────────────────────────────────────────────
        throw new AppError('E002', `SerpAPI error: HTTP ${response.status}`, 502);
      } catch (err) {
        if (err instanceof AppError) throw err;
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          console.warn(
            `[SerpAPI] Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${(err as Error).message}`,
          );
          await this._sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new AppError(
      'E002',
      `SerpAPI request failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
      502,
    );
  }

  /**
   * Map a SerpAPI error message to the appropriate AppError.
   */
  private _throwForApiError(errorMsg: string, statusCode: number): never {
    const lower = errorMsg.toLowerCase();
    if (
      lower.includes('invalid') ||
      lower.includes('unauthorized') ||
      lower.includes('401') ||
      lower.includes('key')
    ) {
      throw new AppError('E010', 'Invalid SerpAPI key', 401);
    }
    if (lower.includes('rate') || lower.includes('429') || lower.includes('limit')) {
      throw new AppError('E001', 'SerpAPI rate limit reached', 429);
    }
    throw new AppError('E002', `SerpAPI error: ${errorMsg}`, statusCode);
  }

  /**
   * Promise-based sleep for backoff delays.
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default SerpAPI;
