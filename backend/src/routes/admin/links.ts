import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createRateLimiter } from '@/middleware/rateLimiter.js';
import { adminAuth } from '@/middleware/adminAuth.js';
import { validate } from '@/middleware/validator.js';
import { AppError } from '@/middleware/errorHandler.js';
import LinkService from '@/services/LinkService.js';
import prisma from '@/lib/prisma.js';

const router: Router = Router();
const rateLimiter = createRateLimiter({ windowMs: 3600000, max: 50 });

const addLinkSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  anchor_text: z.string().min(1, 'Anchor text is required').max(100),
  type: z.enum(['internal', 'external']),
  source_name: z.string().optional(),
});

/**
 * Extract a target slug from a URL.
 * For internal links, extract the last path segment.
 * For external links, use the full URL as the slug.
 */
function extractTargetSlug(url: string, linkType: 'internal' | 'external'): string {
  if (linkType === 'external') {
    return url;
  }

  // Internal: extract slug from URL path
  try {
    // Handle both absolute paths (/article/some-slug) and relative (some-slug)
    const pathname = url.startsWith('/') ? url : `/${url}`;
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || url;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// POST /articles/:id/links — Add link to article
// ---------------------------------------------------------------------------

router.post(
  '/articles/:id/links',
  adminAuth,
  rateLimiter,
  validate(addLinkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const articleId = parseInt(String(req.params.id), 10);
      if (isNaN(articleId)) {
        throw new AppError('E012', 'Invalid article ID', 400);
      }

      const linkService = new LinkService(prisma);

      const link = await linkService.addLink(articleId, {
        targetSlug: extractTargetSlug(req.body.url, req.body.type),
        anchorText: req.body.anchor_text,
        linkType: req.body.type,
      });

      res.status(201).json({
        success: true,
        data: { link },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /articles/:id/links/:linkId — Remove link from article
// ---------------------------------------------------------------------------

router.delete(
  '/articles/:id/links/:linkId',
  adminAuth,
  rateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const articleId = parseInt(String(req.params.id), 10);
      if (isNaN(articleId)) {
        throw new AppError('E012', 'Invalid article ID', 400);
      }

      const linkId = parseInt(String(req.params.linkId), 10);
      if (isNaN(linkId)) {
        throw new AppError('E012', 'Invalid link ID', 400);
      }

      const linkService = new LinkService(prisma);
      await linkService.removeLink(articleId, linkId);

      res.json({
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
