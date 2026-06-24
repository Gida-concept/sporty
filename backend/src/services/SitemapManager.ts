import { config } from '@/config/index.js';
import { PrismaClient, Article } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SitemapPingResult {
  google: boolean;
  bing: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SITEMAP_URLS = 50000;

const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: number }> = [
  { path: '', changefreq: 'daily', priority: 1.0 },
  { path: 'about', changefreq: 'monthly', priority: 0.3 },
  { path: 'contact', changefreq: 'monthly', priority: 0.3 },
  { path: 'privacy', changefreq: 'monthly', priority: 0.3 },
  { path: 'terms', changefreq: 'monthly', priority: 0.3 },
  { path: 'categories', changefreq: 'daily', priority: 0.5 },
];

// ---------------------------------------------------------------------------
// SitemapManager
// ---------------------------------------------------------------------------

class SitemapManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate the top-level sitemap index that references child sitemaps for
   * articles and static pages.
   */
  async generateSitemapIndex(): Promise<string> {
    const now = new Date().toISOString();
    const baseUrl = this.getBaseUrl();

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-articles.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
  }

  /**
   * Generate the article sitemap (urlset). If `articles` is not provided the
   * method fetches published articles from the database ordered by publishedAt
   * descending. The result is limited to 50 000 entries or the provided page
   * size.
   */
  async generateArticleSitemap(articles?: Article[], page?: number): Promise<string> {
    const pageNum = Math.max(1, page ?? 1);
    const pageSize = 1000;

    const resolvedArticles =
      articles ??
      (await this.prisma.article.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: pageSize,
        skip: (pageNum - 1) * pageSize,
      }));

    const limit = MAX_SITEMAP_URLS;
    const sliced = resolvedArticles.slice(0, limit);
    const baseUrl = this.getBaseUrl();

    const urls = sliced.map((article) => {
      const ageInDays = this.ageInDays(article.publishedAt ?? article.createdAt);
      const changefreq = this.getChangeFrequency(ageInDays);
      const priority = this.getPriority(ageInDays);
      const lastmod = (article.updatedAt ?? article.publishedAt ?? article.createdAt).toISOString();
      const articleUrl = `${baseUrl}/article/${article.slug}/`;

      return `  <url>
    <loc>${this.escapeXml(articleUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
    <image:image>
      <image:loc>${baseUrl}/images/featured/${article.slug}.jpg</image:loc>
    </image:image>
  </url>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;
  }

  /**
   * Generate the static-pages sitemap (urlset) for known site routes.
   */
  async generatePageSitemap(): Promise<string> {
    const baseUrl = this.getBaseUrl();

    const urls = STATIC_PAGES.map((page) => {
      const loc = page.path ? `${baseUrl}/${page.path}/` : `${baseUrl}/`;

      return `  <url>
    <loc>${this.escapeXml(loc)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }

  /**
   * Ping Google and Bing to notify them of a sitemap update. Each request has
   * a 5-second timeout. Returns an object indicating which search engines
   * acknowledged the ping.
   */
  async pingSearchEngines(sitemapUrl: string): Promise<SitemapPingResult> {
    const encoded = encodeURIComponent(sitemapUrl);

    const [googleOk, bingOk] = await Promise.all([
      this.pingSearchEngine(`https://www.google.com/ping?sitemap=${encoded}`),
      this.pingSearchEngine(`https://www.bing.com/ping?sitemap=${encoded}`),
    ]);

    return { google: googleOk, bing: bingOk };
  }

  // -----------------------------------------------------------------------
  // URL helpers (not async, no DB access)
  // -----------------------------------------------------------------------

  /**
   * Determine an appropriate change frequency based on the article's age
   * in days.
   */
  getChangeFrequency(ageInDays: number): string {
    if (ageInDays < 1) return 'hourly';
    if (ageInDays < 7) return 'daily';
    if (ageInDays < 30) return 'weekly';
    return 'monthly';
  }

  /**
   * Determine an appropriate sitemap priority based on the article's age
   * in days.
   */
  getPriority(ageInDays: number): number {
    if (ageInDays < 1) return 0.9;
    if (ageInDays < 7) return 0.7;
    if (ageInDays < 30) return 0.5;
    return 0.3;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Compute the age of a date in days relative to the current time.
   */
  private ageInDays(date: Date): number {
    const now = Date.now();
    const diffMs = now - date.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }

  /**
   * Resolve the site base URL from config, stripping any trailing slash.
   */
  private getBaseUrl(): string {
    return (config.siteUrl ?? 'http://localhost:3000').replace(/\/+$/, '');
  }

  /**
   * Minimal XML-escaping for URL values placed in element text content.
   */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Ping a single search-engine sitemap submission endpoint with a 5-second
   * timeout. Returns true if the response status is in the 2xx range.
   */
  private async pingSearchEngine(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default SitemapManager;
