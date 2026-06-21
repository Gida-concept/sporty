import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { adminAuth } from '@/middleware/adminAuth.js';
import { validate } from '@/middleware/validator.js';
import { AppError } from '@/middleware/errorHandler.js';
import AdminService from '@/services/AdminService.js';
import prisma from '@/lib/prisma.js';

const router: Router = Router();
const listLimiter = createRateLimiter({ windowMs: 3600000, max: 100 });
const updateLimiter = createRateLimiter({ windowMs: 3600000, max: 50 });
const deleteLimiter = createRateLimiter({ windowMs: 3600000, max: 20 });

// ---------------------------------------------------------------------------
// GET / — List articles
// ---------------------------------------------------------------------------

router.get('/', adminAuth, listLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const limitParam = parseInt(req.query.limit as string, 10) || 20;
    const limit = Math.min(Math.max(1, limitParam), 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const sortBy = (req.query.sort_by as string) || 'publishedAt';
    const sortOrder = (req.query.sort_order as string) || 'desc';

    const allowedSorts: Record<string, string> = {
      publishedAt: 'publishedAt',
      title: 'title',
      pageviews: 'pageviews',
      updatedAt: 'updatedAt',
    };
    const sort = allowedSorts[sortBy] || 'publishedAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const adminService = new AdminService(prisma);
    const result = await adminService.getArticles({
      status,
      search,
      limit,
      offset,
      sort: sort as 'publishedAt' | 'title' | 'pageviews',
      order,
    });

    res.json({
      success: true,
      data: {
        articles: result.data.map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          meta_description: a.metaDescription,
          h1: a.h1,
          status: a.status,
          word_count: a.wordCount,
          quality_score: a.qualityScore,
          published_at: a.publishedAt?.toISOString() ?? null,
          created_at: a.createdAt.toISOString(),
          updated_at: a.updatedAt.toISOString(),
          pageviews: a.pageviews,
          google_position: a.googlePosition,
        })),
        total: result.total,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — Single article
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  adminAuth,
  listLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        throw new AppError('E012', 'Invalid article ID', 400);
      }

      const adminService = new AdminService(prisma);
      const article = await adminService.getArticleById(id);

      if (!article) {
        res.status(404).json({
          success: false,
          error: {
            code: 'E008',
            message: 'Article not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const articleData = article as any;

      function safeJsonParse(value: string | null): unknown {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      res.json({
        success: true,
        data: {
          article: {
            id: articleData.id,
            slug: articleData.slug,
            title: articleData.title,
            meta_description: articleData.metaDescription,
            h1: articleData.h1,
            content_html: articleData.contentHtml,
            content_blocks: safeJsonParse(articleData.contentBlocks),
            schema_markup: safeJsonParse(articleData.schemaMarkup),
            categories: (articleData.categories || []).map((ac: any) => ({
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
            internal_links: safeJsonParse(article.internalLinks),
            external_links: safeJsonParse(article.externalLinks),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /:id — Update article
// ---------------------------------------------------------------------------

const updateBodySchema = z.object({
  title: z.string().optional(),
  meta_description: z.string().optional(),
  h1: z.string().optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  category_ids: z.array(z.number()).optional(),
});

router.patch(
  '/:id',
  adminAuth,
  updateLimiter,
  validate(updateBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        throw new AppError('E012', 'Invalid article ID', 400);
      }

      const adminService = new AdminService(prisma);

      // Build update payload — map snake_case request to camelCase Prisma fields
      const updateData: Record<string, unknown> = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.meta_description !== undefined)
        updateData.metaDescription = req.body.meta_description;
      if (req.body.h1 !== undefined) updateData.h1 = req.body.h1;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      // Update article fields
      if (Object.keys(updateData).length > 0) {
        await adminService.updateArticle(id, updateData as any);
      }

      // Handle category reassignment if category_ids provided
      if (req.body.category_ids !== undefined) {
        await prisma.articleCategory.deleteMany({
          where: { articleId: id },
        });

        if (req.body.category_ids.length > 0) {
          await prisma.articleCategory.createMany({
            data: req.body.category_ids.map((catId: number) => ({
              articleId: id,
              categoryId: catId,
            })),
          });
        }
      }

      // Re-fetch updated article
      const updatedArticle = await adminService.getArticleById(id);

      if (!updatedArticle) {
        res.status(404).json({
          success: false,
          error: {
            code: 'E008',
            message: 'Article not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedData = updatedArticle as any;

      function safeJsonParse(value: string | null): unknown {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      res.json({
        success: true,
        data: {
          article: {
            id: updatedData.id,
            slug: updatedData.slug,
            title: updatedData.title,
            meta_description: updatedData.metaDescription,
            h1: updatedData.h1,
            content_html: updatedData.contentHtml,
            content_blocks: safeJsonParse(updatedData.contentBlocks),
            schema_markup: safeJsonParse(updatedData.schemaMarkup),
            categories: (updatedData.categories || []).map((ac: any) => ({
              id: ac.category.id,
              name: ac.category.name,
              slug: ac.category.slug,
            })),
            status: updatedArticle.status,
            published_at: updatedArticle.publishedAt?.toISOString() ?? null,
            updated_at: updatedArticle.updatedAt.toISOString(),
            pageviews: updatedArticle.pageviews,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — Delete/archive article
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  adminAuth,
  deleteLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        throw new AppError('E012', 'Invalid article ID', 400);
      }

      const permanent = req.query.permanent === 'true';

      const adminService = new AdminService(prisma);
      await adminService.deleteArticle(id, permanent);

      res.json({
        success: true,
        data: {
          deleted: true,
          permanent,
        },
        message: permanent ? 'Article permanently deleted' : 'Article archived',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
