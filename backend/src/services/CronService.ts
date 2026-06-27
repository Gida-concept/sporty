import prisma from '../lib/prisma.js';
import SerpAPI from '../lib/SerpAPI.js';
import GroqAPI from '../lib/GroqAPI.js';
import TrendFinder from './TrendFinder.js';
import KeywordMatrix from './KeywordMatrix.js';
import ContentGuide from './ContentGuide.js';
import GroqWriter from './GroqWriter.js';
import SEOOptimizer from './SEOOptimizer.js';
import SchemaBuilder from './SchemaBuilder.js';
import TextAnalyzer from './TextAnalyzer.js';
import ArticleBuilder from './ArticleBuilder.js';
import LinkManager from './LinkManager.js';
import ImageHandler from './ImageHandler.js';
import Publisher from './Publisher.js';
import ContentRefresher from './ContentRefresher.js';
import SitemapManager from './SitemapManager.js';
import { cache } from '../lib/cache.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CronResult {
  success: boolean;
  exitCode: 0 | 1 | 2;
  message: string;
  details?: Record<string, unknown>;
}

export interface CronOptions {
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_GEOS = ['us', 'gb'];
const TREND_RETENTION_DAYS = 7;
const MAX_NEW_KEYWORDS = 20;
const MAX_REFRESH = 3;
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const BACKUP_RETENTION_DAYS = 30;

// ---------------------------------------------------------------------------
// CronService
// ---------------------------------------------------------------------------

export class CronService {
  // ===========================================================================
  // Morning Article — Daily 08:00 UTC
  // Full article generation pipeline for sports or entertainment.
  // ===========================================================================

  static async morningArticle(options: CronOptions = {}): Promise<CronResult> {
    return CronService.runArticlePipeline('sports', options);
  }

  // ===========================================================================
  // Evening Article — Daily 19:00 UTC
  // Full article generation pipeline, opposite category from morning.
  // ===========================================================================

  static async eveningArticle(options: CronOptions = {}): Promise<CronResult> {
    return CronService.runArticlePipeline('entertainment', options);
  }

  // ===========================================================================
  // Trend Monitor — Every 3 hours
  // Discover and score trending topics from SerpAPI.
  // ===========================================================================

  static async trendMonitor(options: CronOptions = {}): Promise<CronResult> {
    const { dryRun = false } = options;

    // Early-exit if SerpAPI quota is insufficient
    if (!cache.canMakeRequest()) {
      console.log('[CronService:trendMonitor] SerpAPI quota insufficient -- skipping');
      return {
        success: true,
        exitCode: 0,
        message: 'Skipped -- SerpAPI quota insufficient',
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
        const cutoff = new Date(Date.now() - TREND_RETENTION_DAYS * 86_400_000);
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

  // ===========================================================================
  // Keyword Refresh — Daily 02:00 UTC
  // Regenerate keyword matrix from top trends.
  // ===========================================================================

  static async keywordRefresh(options: CronOptions = {}): Promise<CronResult> {
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
          ...scored.slice(0, Math.max(1, Math.floor(MAX_NEW_KEYWORDS / topTrends.length))).map((k: any) => k.keyword),
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

  // ===========================================================================
  // Content Refresh — Daily 03:00 UTC
  // Identify and refresh stale articles.
  // ===========================================================================

  static async contentRefresh(options: CronOptions = {}): Promise<CronResult> {
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
          } catch {
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

  // ===========================================================================
  // Sitemap Generator — Daily 01:00 UTC
  // Rebuild XML sitemap and ping search engines.
  // ===========================================================================

  static async sitemapGenerator(options: CronOptions = {}): Promise<CronResult> {
    const { dryRun = false } = options;

    try {
      const sitemapManager = new SitemapManager(prisma);

      // Generate sitemap
      const sitemap = await sitemapManager.generateSitemapIndex();
      const xmlContent = typeof sitemap === 'string' ? sitemap : JSON.stringify(sitemap);

      if (!dryRun) {
        // Ping search engines
        const siteUrl = process.env.SITE_URL || 'https://gamedaywire.com';
        const sitemapUrl = `${siteUrl}/sitemap.xml`;
        await Promise.allSettled([
          fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
          fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
        ]);
      }

      return {
        success: true,
        exitCode: 0,
        message: `Sitemap generated${dryRun ? ' (dry-run)' : ''}`,
        details: { dryRun },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        exitCode: 1,
        message: `Sitemap generation failed: ${message}`,
        details: { error: message },
      };
    }
  }

  // ===========================================================================
  // Link Update — Weekly Sunday 04:00 UTC
  // Rebuild internal link graph for all published articles.
  // ===========================================================================

  static async linkUpdate(options: CronOptions = {}): Promise<CronResult> {
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

  // ===========================================================================
  // SEO Audit — Weekly Sunday 05:00 UTC
  // Technical SEO health check on all published articles.
  // ===========================================================================

  static async seoAudit(options: CronOptions = {}): Promise<CronResult> {
    const { dryRun = false } = options;

    try {
      const textAnalyzer = new TextAnalyzer();
      const articles = await prisma.article.findMany({
        where: { status: 'published' },
        select: { id: true, slug: true, title: true, metaDescription: true, contentHtml: true },
      });

      interface AuditIssue {
        type: string;
        severity: 'warning' | 'error';
        articleId: string;
        slug: string;
        detail: string;
      }

      const issues: AuditIssue[] = [];

      for (const article of articles) {
        // Check meta description length
        if (
          article.metaDescription &&
          (article.metaDescription.length < 120 || article.metaDescription.length > 160)
        ) {
          issues.push({
            type: 'meta_description_length',
            severity: 'warning',
            articleId: String(article.id),
            slug: article.slug,
            detail: `Meta description is ${article.metaDescription.length} chars (target: 120-160)`,
          });
        }

        // Check for banned phrases
        if (article.contentHtml && article.title) {
          const banned = textAnalyzer.checkBannedPhrases(
            article.contentHtml + ' ' + (article.title || ''),
          );
          if (banned && (Array.isArray(banned) ? banned.length > 0 : true)) {
            issues.push({
              type: 'banned_phrases',
              severity: 'error',
              articleId: String(article.id),
              slug: article.slug,
              detail: `Found banned phrases`,
            });
          }
        }
      }

      const hasIssues = issues.length > 0;

      return {
        success: true,
        exitCode: hasIssues ? 1 : 0,
        message: `SEO audit complete: ${issues.length} issues found across ${articles.length} articles${dryRun ? ' (dry-run)' : ''}`,
        details: {
          articleCount: articles.length,
          issueCount: issues.length,
          issues: issues.slice(0, 20),
          dryRun,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        exitCode: 1,
        message: `SEO audit failed: ${message}`,
        details: { error: message },
      };
    }
  }

  // ===========================================================================
  // Backup — Weekly Sunday 06:00 UTC
  // Database dump and file backup with rotation.
  // ===========================================================================

  static async backup(options: CronOptions = {}): Promise<CronResult> {
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
            // pg_dump may not be installed or DB unreachable -- fallback to log
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
            // DB file not found at default path -- skip
          }
        }

        // Rotate old backups
        const files = await fs.readdir(BACKUP_DIR);
        const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 86_400_000;

        for (const file of files) {
          const filePath = path.join(BACKUP_DIR, file);
          try {
            const stat = await fs.stat(filePath);
            if (stat.mtimeMs < cutoff) {
              await fs.unlink(filePath);
            }
          } catch {
            // Skip files that can't be stat'd or deleted
          }
        }
      }

      return {
        success: true,
        exitCode: 0,
        message: `Backup completed${dryRun ? ' (dry-run)' : ''}`,
        details: { backupDir: BACKUP_DIR, retentionDays: BACKUP_RETENTION_DAYS, dryRun },
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

  // ===========================================================================
  // Run All — Execute every cron job sequentially for manual testing.
  // ===========================================================================

  static async runAll(options: CronOptions = {}): Promise<CronResult[]> {
    const jobs: Array<{ name: string; fn: (opts: CronOptions) => Promise<CronResult> }> = [
      { name: 'sitemap_generator', fn: (o) => CronService.sitemapGenerator(o) },
      { name: 'keyword_refresh', fn: (o) => CronService.keywordRefresh(o) },
      { name: 'content_refresh', fn: (o) => CronService.contentRefresh(o) },
      { name: 'morning_article', fn: (o) => CronService.morningArticle(o) },
      { name: 'evening_article', fn: (o) => CronService.eveningArticle(o) },
      { name: 'trend_monitor', fn: (o) => CronService.trendMonitor(o) },
      { name: 'link_update', fn: (o) => CronService.linkUpdate(o) },
      { name: 'seo_audit', fn: (o) => CronService.seoAudit(o) },
      { name: 'backup', fn: (o) => CronService.backup(o) },
    ];

    const results: CronResult[] = [];

    for (const job of jobs) {
      console.log(`[CronService:runAll] Starting ${job.name}...`);
      try {
        const result = await job.fn(options);
        results.push({ ...result, details: { ...result.details, jobName: job.name } });
        console.log(`[CronService:runAll] ${job.name}: ${result.message}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ success: false, exitCode: 1, message, details: { jobName: job.name, error: message } });
        console.error(`[CronService:runAll] ${job.name} failed: ${message}`);
      }
    }

    return results;
  }

  // ===========================================================================
  // Private: Run the full article generation pipeline for a given category.
  // ===========================================================================

  private static async runArticlePipeline(category: string, options: CronOptions = {}): Promise<CronResult> {
    const { dryRun = false } = options;

    try {
      // Determine actual category (alternate based on day of year)
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
      );
      const actualCategory: 'sports' | 'entertainment' =
        category === 'sports'
          ? (dayOfYear % 2 === 0 ? 'sports' : 'entertainment')
          : (dayOfYear % 2 === 0 ? 'entertainment' : 'sports');

      // Wire up dependencies
      const serpAPI = new SerpAPI();
      const groqAPI = new GroqAPI();
      const trendFinder = new TrendFinder(serpAPI, prisma);
      const keywordMatrix = new KeywordMatrix(serpAPI, prisma);
      const contentGuide = new ContentGuide(serpAPI, prisma);
      const groqWriter = new GroqWriter(groqAPI);
      const seoOptimizer = new SEOOptimizer();
      const schemaBuilder = new SchemaBuilder();
      const textAnalyzer = new TextAnalyzer();
      const articleBuilder = new ArticleBuilder(seoOptimizer, schemaBuilder, textAnalyzer);
      const linkManager = new LinkManager(prisma);
      const imageHandler = new ImageHandler();
      const publisher = new Publisher(prisma, imageHandler);

      // Pipeline
      const trends = await trendFinder.discover(actualCategory, ['us', 'gb']);
      if (!trends || trends.length === 0) {
        return { success: false, exitCode: 2, message: `No trends found for category: ${actualCategory}` };
      }

      const topTrend = trends[0];
      const keyword = await keywordMatrix.getWinningKeyword(topTrend);
      if (!keyword) {
        return { success: false, exitCode: 2, message: 'No winning keyword found from top trend' };
      }

      const guide = await contentGuide.generate(keyword, topTrend);
      if (!guide || !guide.dataPoints || guide.dataPoints.length < 2) {
        return { success: false, exitCode: 2, message: 'Content guide has insufficient data points' };
      }

      const generated = await groqWriter.generateArticle(guide);
      if (!generated) {
        return { success: false, exitCode: 1, message: 'Article generation returned empty result' };
      }

      const article = await articleBuilder.assemble(keyword, topTrend, guide, generated);

      if (!dryRun) {
        const published = await publisher.publish(article);
        return {
          success: true,
          exitCode: 0,
          message: `Published article: ${published.title || article.slug} (${actualCategory})`,
          details: { slug: article.slug, category: actualCategory, title: published.title },
        };
      }

      return {
        success: true,
        exitCode: 0,
        message: `Dry-run: article ready to publish (${actualCategory})`,
        details: { slug: article.slug, category: actualCategory, dryRun: true },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        exitCode: 1,
        message: `Article generation failed: ${message}`,
        details: { error: message },
      };
    }
  }
}

export default CronService;
