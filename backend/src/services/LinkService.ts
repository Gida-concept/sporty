import { PrismaClient, LinkGraph } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddLinkInput {
  targetSlug: string;
  anchorText: string;
  linkType: 'internal' | 'external';
  contextSnippet?: string;
}

export interface LinkJsonEntry {
  linkGraphId: string;
  targetSlug: string;
  anchorText: string;
  linkType: string;
  contextSnippet?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ANCHOR_TEXT_LENGTH = 100;

// ---------------------------------------------------------------------------
// LinkService
// ---------------------------------------------------------------------------

class LinkService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Add a link (internal or external) to an article.
   *
   * Creates a LinkGraph record and updates the Article's internalLinks or
   * externalLinks JSON array. Internal links go into internalLinks; all
   * other link types go into externalLinks.
   */
  async addLink(articleId: string, data: AddLinkInput): Promise<LinkGraph> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, slug: true, internalLinks: true, externalLinks: true },
    });

    if (!article) {
      throw new AppError('E008', `Article with id ${articleId} not found`, 404);
    }

    // Create the LinkGraph record
    const linkGraphEntry = await this.prisma.linkGraph.create({
      data: {
        sourceSlug: article.slug,
        targetSlug: data.targetSlug,
        anchorText: data.anchorText.substring(0, MAX_ANCHOR_TEXT_LENGTH),
        linkType: data.linkType,
        contextSnippet: data.contextSnippet ?? null,
        articleId,
      },
    });

    // Update the Article's JSON link array
    const linkEntry: LinkJsonEntry = {
      linkGraphId: linkGraphEntry.id,
      targetSlug: data.targetSlug,
      anchorText: data.anchorText,
      linkType: data.linkType,
      contextSnippet: data.contextSnippet,
    };

    const targetField = data.linkType === 'internal' ? 'internalLinks' : 'externalLinks';
    const currentLinks: LinkJsonEntry[] = this.parseLinkJson(article[targetField]);

    currentLinks.push(linkEntry);

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        [targetField]: JSON.stringify(currentLinks),
      },
    });

    return linkGraphEntry;
  }

  /**
   * Remove a link (LinkGraph entry) from an article.
   * Deletes the LinkGraph record and removes the corresponding entry from
   * the Article's internalLinks or externalLinks JSON array.
   */
  async removeLink(articleId: string, linkId: string): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, internalLinks: true, externalLinks: true },
    });

    if (!article) {
      throw new AppError('E008', `Article with id ${articleId} not found`, 404);
    }

    // Verify the LinkGraph entry exists and belongs to this article
    const linkEntry = await this.prisma.linkGraph.findUnique({
      where: { id: linkId },
    });

    if (!linkEntry) {
      throw new AppError('E008', `LinkGraph entry with id ${linkId} not found`, 404);
    }

    if (linkEntry.articleId !== articleId) {
      throw new AppError(
        'E008',
        `LinkGraph entry ${linkId} does not belong to article ${articleId}`,
        409,
      );
    }

    // Delete the LinkGraph record
    await this.prisma.linkGraph.delete({
      where: { id: linkId },
    });

    // Remove from the appropriate JSON array on the Article
    const targetField = linkEntry.linkType === 'internal' ? 'internalLinks' : 'externalLinks';
    const currentLinks: LinkJsonEntry[] = this.parseLinkJson(article[targetField]);
    const filteredLinks = currentLinks.filter((l) => l.linkGraphId !== linkId);

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        [targetField]: filteredLinks.length > 0 ? JSON.stringify(filteredLinks) : null,
      },
    });
  }

  /**
   * Get all LinkGraph entries for a given article.
   */
  async getArticleLinks(articleId: string): Promise<LinkGraph[]> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });

    if (!article) {
      throw new AppError('E008', `Article with id ${articleId} not found`, 404);
    }

    return this.prisma.linkGraph.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Rebuild the LinkGraph table for an article from its internalLinks and
   * externalLinks JSON arrays.
   *
   * This is useful when the JSON arrays were modified directly (e.g., during
   * content generation) and the LinkGraph table needs to be synchronized.
   */
  async syncLinkGraph(articleId: string): Promise<number> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        slug: true,
        internalLinks: true,
        externalLinks: true,
      },
    });

    if (!article) {
      throw new AppError('E008', `Article with id ${articleId} not found`, 404);
    }

    // Delete existing LinkGraph entries for this article
    await this.prisma.linkGraph.deleteMany({
      where: { articleId },
    });

    // Collect all link entries from both JSON arrays
    const internalEntries: LinkJsonEntry[] = this.parseLinkJson(article.internalLinks);
    const externalEntries: LinkJsonEntry[] = this.parseLinkJson(article.externalLinks);
    const allEntries = [...internalEntries, ...externalEntries];

    if (allEntries.length === 0) {
      return 0;
    }

    // Re-create LinkGraph records
    await this.prisma.linkGraph.createMany({
      data: allEntries.map((entry) => ({
        sourceSlug: article.slug,
        targetSlug: entry.targetSlug,
        anchorText: entry.anchorText.substring(0, MAX_ANCHOR_TEXT_LENGTH),
        linkType: entry.linkType,
        contextSnippet: entry.contextSnippet ?? null,
        articleId,
      })),
    });

    return allEntries.length;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Safely parse a JSON link array from an article's internalLinks or
   * externalLinks field, returning an empty array for null/undefined values.
   */
  private parseLinkJson(value: string | null | undefined): LinkJsonEntry[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as LinkJsonEntry[];
      }
      return [];
    } catch {
      return [];
    }
  }
}

export default LinkService;
