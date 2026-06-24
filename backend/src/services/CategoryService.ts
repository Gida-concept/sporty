import { PrismaClient, Category } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryWithCount extends Category {
  _count: {
    articles: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a URL-friendly slug from a name string.
 * Lowercases, replaces non-alphanumeric characters with hyphens, collapses
 * consecutive hyphens, and trims leading/trailing hyphens.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// CategoryService
// ---------------------------------------------------------------------------

class CategoryService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Return all categories, each annotated with the number of associated
   * articles.
   */
  async getAll(): Promise<CategoryWithCount[]> {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { name: 'asc' },
    }) as Promise<CategoryWithCount[]>;
  }

  /**
   * Fetch a single category by its primary key, including article count.
   */
  async getById(id: string): Promise<CategoryWithCount | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    }) as Promise<CategoryWithCount | null>;
  }

  /**
   * Create a new category.
   * Automatically generates a slug from the name if one is not provided.
   * Validates that both name and slug are unique before inserting.
   */
  async create(data: CreateCategoryInput): Promise<Category> {
    const slug = slugify(data.name);

    // Check uniqueness of name
    const existingName = await this.prisma.category.findUnique({
      where: { name: data.name },
    });
    if (existingName) {
      throw new AppError('E008', `Category with name '${data.name}' already exists`, 409);
    }

    // Check uniqueness of slug
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new AppError('E008', `Category with slug '${slug}' already exists`, 409);
    }

    return this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
      },
    });
  }

  /**
   * Update an existing category.
   * Validates that the new name and slug (if changed) are unique.
   */
  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('E008', `Category with id ${id} not found`, 404);
    }

    // If name is changing, check uniqueness
    if (data.name && data.name !== existing.name) {
      const nameConflict = await this.prisma.category.findUnique({
        where: { name: data.name },
      });
      if (nameConflict) {
        throw new AppError('E008', `Category with name '${data.name}' already exists`, 409);
      }
    }

    // If slug is provided and changing, check uniqueness
    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (slugConflict) {
        throw new AppError('E008', `Category with slug '${data.slug}' already exists`, 409);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a category.
   *
   * If the category has articles and no reassignToId is provided, an AppError
   * (E009) is thrown. If reassignToId is provided, all articles in the
   * category are reassigned before the category is deleted. If the category
   * has no articles, it is deleted directly.
   */
  async delete(id: string, reassignToId?: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('E008', `Category with id ${id} not found`, 404);
    }

    const articleCount = existing._count.articles;

    if (articleCount > 0) {
      if (!reassignToId) {
        throw new AppError(
          'E009',
          `Category '${existing.name}' has ${articleCount} article(s). Provide reassignToId or remove articles first.`,
          409,
        );
      }

      // Validate the target category exists
      const targetCategory = await this.prisma.category.findUnique({
        where: { id: reassignToId },
      });
      if (!targetCategory) {
        throw new AppError('E008', `Target category with id ${reassignToId} not found`, 404);
      }

      // Reassign all ArticleCategory rows from the old category to the new one
      const articleCategories = await this.prisma.articleCategory.findMany({
        where: { categoryId: id },
      });

      // Delete existing mappings then create new ones
      // (We can't update the composite key in place)
      await this.prisma.articleCategory.deleteMany({
        where: { categoryId: id },
      });

      if (articleCategories.length > 0) {
        await this.prisma.articleCategory.createMany({
          data: articleCategories.map((ac) => ({
            articleId: ac.articleId,
            categoryId: reassignToId,
          })),
        });
      }
    }

    await this.prisma.category.delete({ where: { id } });
  }
}

export default CategoryService;
