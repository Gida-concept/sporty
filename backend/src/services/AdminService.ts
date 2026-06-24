import { PrismaClient, Article } from '@prisma/client';
import { AppError } from '@/middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArticleFilters {
  status?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: 'publishedAt' | 'title' | 'pageviews';
  order?: 'asc' | 'desc';
}

export interface PaginatedArticles {
  data: Article[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardStats {
  totalArticles: number;
  totalDrafts: number;
  totalTrends: number;
  totalKeywords: number;
  keywordsPending: number;
  keywordsActive: number;
  keywordsExhausted: number;
  publishedToday: number;
  totalPageviews: number;
  avgReadability: number | null;
  lastGenerationDate: Date | null;
  articlesByCategory: Array<{
    categoryName: string;
    categorySlug: string;
    count: number;
  }>;
}

// ---------------------------------------------------------------------------
// AdminService
// ---------------------------------------------------------------------------

class AdminService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Dashboard
  // -----------------------------------------------------------------------

  /**
   * Aggregate site-wide statistics for the admin dashboard.
   * Returns article counts (total, drafts, published today), trend/keyword
   * counts, total pageviews, average reading level, last generation date,
   * and article counts broken down by category.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      totalArticles,
      totalDrafts,
      totalTrends,
      keywordCounts,
      publishedToday,
      pageviewSum,
      readabilityAvg,
      lastArticle,
      categoriesWithCounts,
    ] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.article.count({ where: { status: 'draft' } }),
      this.prisma.trend.count(),
      this.prisma.keyword.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.article.count({
        where: {
          status: 'published',
          publishedAt: { gte: startOfToday },
        },
      }),
      this.prisma.article.aggregate({
        _sum: { pageviews: true },
      }),
      this.prisma.article.aggregate({
        where: { status: 'published' },
        _avg: { readingLevel: true },
      }),
      this.prisma.article.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.category.findMany({
        include: {
          _count: {
            select: { articles: true },
          },
        },
      }),
    ]);

    // Derive keyword counts by status from groupBy result
    let keywordsPending = 0;
    let keywordsActive = 0;
    let keywordsExhausted = 0;

    for (const entry of keywordCounts) {
      switch (entry.status) {
        case 'pending':
          keywordsPending = entry._count.status;
          break;
        case 'active':
          keywordsActive = entry._count.status;
          break;
        case 'exhausted':
          keywordsExhausted = entry._count.status;
          break;
      }
    }

    const totalKeywords = keywordsPending + keywordsActive + keywordsExhausted;

    // Map categories with article counts, excluding empty ones
    const articlesByCategory = categoriesWithCounts
      .filter((c) => c._count.articles > 0)
      .map((c) => ({
        categoryName: c.name,
        categorySlug: c.slug,
        count: c._count.articles,
      }));

    return {
      totalArticles,
      totalDrafts,
      totalTrends,
      totalKeywords,
      keywordsPending,
      keywordsActive,
      keywordsExhausted,
      publishedToday,
      totalPageviews: pageviewSum._sum.pageviews ?? 0,
      avgReadability: readabilityAvg._avg.readingLevel ?? null,
      lastGenerationDate: lastArticle?.createdAt ?? null,
      articlesByCategory,
    };
  }

  // -----------------------------------------------------------------------
  // Article CRUD
  // -----------------------------------------------------------------------

  /**
   * Retrieve a paginated, sorted, and filtered list of articles.
   * Supports filtering by status, category slug, and text search (title/slug).
   * Defaults: limit 20, offset 0, sort by publishedAt descending.
   */
  async getArticles(filters: ArticleFilters = {}): Promise<PaginatedArticles> {
    const {
      status,
      category,
      search,
      limit = 20,
      offset = 0,
      sort = 'publishedAt',
      order = 'desc',
    } = filters;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category,
          },
        },
      };
    }

    if (search) {
      where.OR = [{ title: { contains: search } }, { slug: { contains: search } }];
    }

    const [data, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          categories: {
            include: { category: true },
          },
        },
        orderBy: { [sort]: order },
        take: limit,
        skip: offset,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Fetch a single article by its primary key, including its category
   * associations.
   */
  async getArticleById(id: string): Promise<Article | null> {
    return this.prisma.article.findUnique({
      where: { id },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });
  }

  /**
   * Update one or more fields on an existing article.
   * Returns the updated article with categories included.
   */
  async updateArticle(
    id: string,
    data: Partial<
      Pick<
        Article,
        'title' | 'slug' | 'metaDescription' | 'h1' | 'contentHtml' | 'status' | 'qualityScore'
      >
    >,
  ): Promise<Article | null> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('E008', `Article with id ${id} not found`, 404);
    }

    return this.prisma.article.update({
      where: { id },
      data,
      include: {
        categories: {
          include: { category: true },
        },
      },
    });
  }

  /**
   * Delete an article. When permanent is false (default) the article's status
   * is set to 'archived' (soft delete). When permanent is true the record is
   * deleted from the database, which cascades to related PageView, SeoMetric,
   * and LinkGraph rows.
   */
  async deleteArticle(id: string, permanent: boolean = false): Promise<void> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('E008', `Article with id ${id} not found`, 404);
    }

    if (permanent) {
      await this.prisma.article.delete({ where: { id } });
    } else {
      await this.prisma.article.update({
        where: { id },
        data: { status: 'archived' },
      });
    }
  }
}

export default AdminService;
