import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { cache } from '@/middleware/cache.js';
import prisma from '@/lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 200 });

router.get(
  '/',
  rateLimiter,
  cache({ ttl: 3600 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const status = (req.query.status as string) || 'published';
      const slug = req.query.slug as string | undefined;
      const search = req.query.search as string | undefined;
      const limitParam = parseInt(req.query.limit as string, 10) || 20;
      const limit = Math.min(Math.max(1, limitParam), 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const sortBy = (req.query.sort_by as string) || 'publishedAt';
      const sortOrder = (req.query.sort_order as string) || 'desc';
      const includeBody = req.query.include_body === 'true';

      const where: Record<string, unknown> = {};

      if (status && status !== 'all') {
        where.status = status;
      }

      if (slug) {
        where.slug = slug;
      }

      if (category && category !== 'all') {
        where.categories = {
          some: { category: { slug: category } },
        };
      }

      if (search && search.length >= 3) {
        where.title = { contains: search };
      }

      if (req.query.tag) {
        where.tags = { contains: req.query.tag as string };
      }

      if (req.query.featured === 'true') {
        where.featured = true;
      }

      const allowedSorts: Record<string, string> = {
        publishedAt: 'publishedAt',
        title: 'title',
        wordCount: 'wordCount',
        pageviews: 'pageviews',
        googlePosition: 'googlePosition',
      };
      const sortField = allowedSorts[sortBy] || 'publishedAt';
      const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

      const include = {
        categories: { include: { category: true } },
      };

      function safeJsonParse(value: string | null): unknown {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      // Single article by slug — return full data
      if (slug) {
        const article = await prisma.article.findFirst({
          where,
          include,
        });

        if (!article) {
          res.status(404).json({
            success: false,
            error: {
              code: 'E002',
              message: 'Article not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          success: true,
          data: {
            article: {
              id: article.id,
              slug: article.slug,
              title: article.title,
              meta_description: article.metaDescription,
              h1: article.h1,
              content_html: article.contentHtml,
              content_blocks: safeJsonParse(article.contentBlocks),
              schema_markup: safeJsonParse(article.schemaMarkup),
              categories: article.categories.map((ac) => ({
                id: ac.category.id,
                name: ac.category.name,
                slug: ac.category.slug,
              })),
              keyword_id: article.keywordId,
              trend_id: article.trendId,
              word_count: article.wordCount,
              reading_level: article.readingLevel,
              quality_score: article.qualityScore,
              status: article.status,
              published_at: article.publishedAt?.toISOString() ?? null,
              created_at: article.createdAt.toISOString(),
              updated_at: article.updatedAt.toISOString(),
              pageviews: article.pageviews,
              avg_time_on_page: article.avgTimeOnPage,
              google_position: article.googlePosition,
              image_url: article.imageUrl,
              excerpt: article.excerpt,
              author: article.author,
              featured: article.featured,
              tags: safeJsonParse(article.tags) as string[] | null,
              internal_links: safeJsonParse(article.internalLinks),
              external_links: safeJsonParse(article.externalLinks),
            },
          },
          cached: false,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // List articles with pagination
      const [articles, total] = await Promise.all([
        prisma.article.findMany({
          where: where as any,
          orderBy: { [sortField]: orderDirection },
          take: limit,
          skip: offset,
          include,
        }),
        prisma.article.count({ where: where as any }),
      ]);

      res.json({
        success: true,
        data: {
          articles: articles.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            meta_description: a.metaDescription,
            h1: a.h1,
            categories: a.categories.map((ac) => ({
              id: ac.category.id,
              name: ac.category.name,
              slug: ac.category.slug,
            })),
            word_count: a.wordCount,
            reading_level: a.readingLevel,
            quality_score: a.qualityScore,
            status: a.status,
            published_at: a.publishedAt?.toISOString() ?? null,
            updated_at: a.updatedAt.toISOString(),
            pageviews: a.pageviews,
            google_position: a.googlePosition,
            image_url: a.imageUrl,
            excerpt: a.excerpt,
            author: a.author,
            featured: a.featured,
            tags: safeJsonParse(a.tags) as string[] | null,
            internal_links: safeJsonParse(a.internalLinks),
            external_links: safeJsonParse(a.externalLinks),
            ...(includeBody
              ? {
                  content_html: a.contentHtml,
                  content_blocks: safeJsonParse(a.contentBlocks),
                }
              : {}),
          })),
        },
        count: articles.length,
        total,
        offset,
        limit,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
