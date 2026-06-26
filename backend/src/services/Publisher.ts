import { AppError } from '../middleware/errorHandler.js';
import { PrismaClient, Article } from '@prisma/client';

/**
 * Minimal interface for ImageHandler — defined here because the full service
 * is created in a later phase.
 */
export interface ImageHandler {
  generateFeaturedImage(
    article: { slug: string; title: string; category?: string },
    style?: string,
  ): string;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityResult {
  passed: boolean;
  failures: string[];
  score: number; // 0-100
  details: Record<string, boolean | number | string>;
}

export type ContentBlock = {
  type: 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'table';
  text?: string;
  items?: string[];
  source?: string;
  headers?: string[];
  rows?: string[][];
};

export interface ArticleData {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  contentHtml: string;
  contentBlocks: string;
  keywordId: string;
  trendId: string | null;
  wordCount: number;
  readingLevel: number;
  schemaMarkup: string;
  internalLinks: string;
  externalLinks: string;
  status: string;
  generationAttempts: number;
  qualityScore: number | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BANNED_PHRASES = [
  // Generic openers
  "in today's digital age",
  "in today's world",
  'in the world of sports',
  "in today's entertainment news",
  'in this article, we will',
  'welcome to our guide on',
  // Filler phrases
  'it is important to note that',
  'it is worth mentioning that',
  'it goes without saying that',
  'as we have seen',
  'as mentioned earlier',
  'needless to say',
  'it should be noted that',
  // Conclusion clichés
  'in conclusion',
  'to sum up',
  'in summary',
  'in closing',
  'to wrap things up',
  // AI hallucination markers
  'the landscape of',
  'a tapestry of',
  'delve into',
  'multifaceted',
  'leverage',
  'robust',
  'game-changer',
  'revolutionary',
  'in the ever-evolving world of',
  'in the rapidly changing landscape of',
  "it's a complex and nuanced topic",
  // Overused AI modifiers
  'truly',
  'essentially',
  'basically',
  'importantly',
  'interestingly',
  'notably',
  'significantly',
  'crucially',
  'undoubtedly',
];

// ---------------------------------------------------------------------------
// Publisher
// ---------------------------------------------------------------------------

class Publisher {
  private prisma: PrismaClient;
  private imageHandler: ImageHandler;

  constructor(prisma: PrismaClient, imageHandler: ImageHandler) {
    this.prisma = prisma;
    this.imageHandler = imageHandler;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Validate and publish an article.  Runs the quality gate, persists the
   * article as a draft first, then optionally transitions it to published.
   */
  async publish(articleData: ArticleData, autoPublish: boolean = true): Promise<Article> {
    // 1. Quality gate
    const quality = await this.qualityCheck(articleData);
    if (!quality.passed) {
      throw new AppError('E004', `Article "${articleData.slug}" failed quality check`, 422, {
        failures: quality.failures,
        score: quality.score,
      });
    }

    // 2. Save as draft directly (type inferred from Prisma)
    const article = await this.prisma.article.create({
      data: {
        slug: articleData.slug,
        title: articleData.title,
        metaDescription: articleData.metaDescription,
        h1: articleData.h1,
        contentHtml: articleData.contentHtml,
        contentBlocks: articleData.contentBlocks,
        keyword: { connect: { id: articleData.keywordId } },
        wordCount: articleData.wordCount,
        readingLevel: articleData.readingLevel,
        schemaMarkup: articleData.schemaMarkup,
        internalLinks: articleData.internalLinks,
        externalLinks: articleData.externalLinks,
        status: 'draft',
        generationAttempts: articleData.generationAttempts,
        qualityScore: quality.score,
      },
    });

    // 4. Optionally publish
    if (autoPublish && quality.passed) {
      const featuredImageUrl = this.imageHandler.generateFeaturedImage({
        slug: articleData.slug,
        title: articleData.title,
      });

      // Connect trend if available
      const trendConnect = articleData.trendId
        ? { trend: { connect: { id: articleData.trendId } } }
        : {};

      const updated = await this.prisma.article.update({
        where: { id: article.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          ...trendConnect,
        },
      });

      // 5. Log the publication
      await this.prisma.systemLog.create({
        data: {
          logType: 'publisher',
          severity: 'info',
          message: `Article published: "${articleData.slug}"`,
          metadata: JSON.stringify({
            articleId: updated.id,
            slug: updated.slug,
            qualityScore: quality.score,
          }),
        },
      });

      return updated;
    }

    return article;
  }

  // -----------------------------------------------------------------------
  // HTML generation
  // -----------------------------------------------------------------------

  /**
   * Convert an array of ContentBlocks into a single HTML string.
   */
  generateHtml(blocks: ContentBlock[]): string {
    return blocks
      .map((block) => {
        switch (block.type) {
          case 'h2':
            return `<h2>${this.escapeHtml(block.text ?? '')}</h2>`;
          case 'h3':
            return `<h3>${this.escapeHtml(block.text ?? '')}</h3>`;
          case 'p':
            return `<p>${this.escapeHtml(block.text ?? '')}</p>`;
          case 'ul':
            return `<ul>${(block.items ?? [])
              .map((item) => `<li>${this.escapeHtml(item)}</li>`)
              .join('')}</ul>`;
          case 'ol':
            return `<ol>${(block.items ?? [])
              .map((item) => `<li>${this.escapeHtml(item)}</li>`)
              .join('')}</ol>`;
          case 'blockquote':
            return `<blockquote><p>${this.escapeHtml(block.text ?? '')}</p>${
              block.source ? `<cite>${this.escapeHtml(block.source)}</cite>` : ''
            }</blockquote>`;
          case 'table':
            return this.buildTableHtml(block.headers ?? [], block.rows ?? []);
          default:
            return '';
        }
      })
      .join('\n');
  }

  // -----------------------------------------------------------------------
  // Quality checks
  // -----------------------------------------------------------------------

  /**
   * Run all 7 quality rules against the article data.
   *
   * Each rule accounts for ~14.3 points (100/7).
   */
  async qualityCheck(article: ArticleData): Promise<QualityResult> {
    const failures: string[] = [];
    const details: Record<string, boolean | number | string> = {};

    // ---- Rule 1: Minimum word count (≥ 800) ----
    const wordCountRule = article.wordCount >= 800;
    details.wordCount = article.wordCount;
    if (!wordCountRule) {
      failures.push(`Word count ${article.wordCount} is below minimum of 800`);
    }

    // ---- Rule 2: Minimum data points (statistical evidence) ----
    // Heuristic: count digit sequences, percentages, and dollar amounts in
    // the HTML content.
    const numberPattern = /\b\d{2,}\b|\b\d+\.\d+\b|\b\d+%\b|\$\d+(?:,\d{3})*(?:\.\d+)?\b/g;
    const dataPointCount = (article.contentHtml.match(numberPattern) ?? []).length;
    const dataPointRule = dataPointCount >= 3;
    details.dataPointCount = dataPointCount;
    if (!dataPointRule) {
      failures.push(`Only ${dataPointCount} data points found; minimum is 3`);
    }

    // ---- Rule 3: No banned phrases ----
    const contentLower = article.contentHtml.toLowerCase();
    const matchedPhrases = BANNED_PHRASES.filter((phrase) =>
      contentLower.includes(phrase.toLowerCase()),
    );
    const bannedPhraseRule = matchedPhrases.length === 0;
    details.bannedPhrasesMatched = matchedPhrases.length;
    details.bannedPhrasesList = matchedPhrases.join(', ');
    if (!bannedPhraseRule) {
      failures.push(
        `Contains ${matchedPhrases.length} banned phrase(s): ${matchedPhrases.join('; ')}`,
      );
    }

    // ---- Rule 4: Readability (Flesch-Kincaid 50-80) ----
    const readingLevel = article.readingLevel;
    const readabilityRule = readingLevel >= 50 && readingLevel <= 80;
    details.readingLevel = readingLevel;
    if (!readabilityRule) {
      failures.push(`Reading level ${readingLevel} is outside the target range (50-80)`);
    }

    // ---- Rule 5: Original structure (not generic intro) ----
    // Banned-phrase check above already catches most generic intros.
    // This rule flags content that starts with a generic opener pattern.
    const firstTwoHundred = contentLower.slice(0, 200);
    const genericIntroPatterns = BANNED_PHRASES.filter((p) =>
      firstTwoHundred.includes(p.toLowerCase()),
    );
    const structureRule = genericIntroPatterns.length === 0;
    details.genericIntros = genericIntroPatterns.length;
    if (!structureRule) {
      failures.push('Content begins with a generic intro pattern');
    }

    // ---- Rule 6: At least 3 subheadings (h2/h3) ----
    const headingMatches = article.contentHtml.match(/<h[23][^>]*>/gi) ?? [];
    const headingCount = headingMatches.length;
    const headingRule = headingCount >= 3;
    details.headingCount = headingCount;
    if (!headingRule) {
      failures.push(`Only ${headingCount} subheading(s) found; minimum is 3`);
    }

    // ---- Rule 7: Not a duplicate of an existing article for the same keyword ----
    let duplicateRule = true;
    let duplicateCount = 0;
    try {
      duplicateCount = await this.countExistingForKeyword(article.keywordId);
      duplicateRule = duplicateCount === 0;
    } catch {
      // If the query fails, treat as non-blocking (log would happen elsewhere)
      details.duplicateCheckError = 'query_failed';
    }
    details.existingArticlesForKeyword = duplicateCount;
    if (!duplicateRule) {
      failures.push(
        `${duplicateCount} existing article(s) already reference keywordId ${article.keywordId}`,
      );
    }

    // ---- Score ----
    const rulesPassed = [
      wordCountRule,
      dataPointRule,
      bannedPhraseRule,
      readabilityRule,
      structureRule,
      headingRule,
      duplicateRule,
    ].filter(Boolean).length;

    const score = Math.round((rulesPassed / 7) * 100);

    return {
      passed: failures.length === 0,
      failures,
      score,
      details,
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Escape HTML special characters in text content.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Build a <table> element from headers and row data.
   */
  private buildTableHtml(headers: string[], rows: string[][]): string {
    const thead =
      headers.length > 0
        ? `<thead><tr>${headers.map((h) => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr></thead>`
        : '';

    const tbody =
      rows.length > 0
        ? `<tbody>${rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody>`
        : '';

    return `<table>${thead}${tbody}</table>`;
  }

  /**
   * Count how many published articles already exist for the given keyword.
   */
  private async countExistingForKeyword(keywordId: string): Promise<number> {
    return this.prisma.article.count({
      where: {
        keywordId,
        status: { in: ['published', 'draft'] },
      },
    });
  }
}

export default Publisher;
