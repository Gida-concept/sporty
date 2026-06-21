import { AppError } from '@/middleware/errorHandler.js';
import SEOOptimizer from './SEOOptimizer.js';
import SchemaBuilder from './SchemaBuilder.js';
// Local type stubs (Prisma types not yet available)
interface Keyword {
  id: number;
  keyword: string;
  headTerm: string;
  modifier: string | null;
  intent: string | null;
  categoryId: number;
}
interface Trend {
  id: number;
  query: string;
  categoryId: number;
}

/**
 * Minimal interface for TextAnalyzer — defined here because the full service
 * is created in a later phase. Only the methods used by ArticleBuilder are
 * declared.
 */
export interface TextAnalyzer {
  calculateReadingLevel(text: string): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types (matching GroqWriter's output types)
// ─────────────────────────────────────────────────────────────────────────────

export type ContentBlockType = 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'table';

export interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  items?: string[];
  source?: string;
  headers?: string[];
  rows?: string[][];
}

export interface GeneratedContent {
  title: string;
  meta_description: string;
  h1: string;
  content_blocks: ContentBlock[];
  faq: Array<{ question: string; answer: string }>;
  schema_markup: Record<string, unknown>;
  suggested_images: Array<{ description: string; alt_text: string }>;
}

export interface GuideData {
  guideId: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  articleType: string;
  targetWordCount: number;
  readingLevel: string;
  serpAnalysis: {
    avgWordCount: number;
    commonSubheadings: string[];
    contentGaps: string[];
    featuredSnippetFormat: string | null;
    paaQuestions: string[];
  };
  dataPoints: string[];
  narrativeAngle: string;
  sectionBlueprint: string[];
  forbiddenPatterns: string[];
  internalLinkOpportunities: string[];
  externalLinkOpportunities: string[];
}

/**
 * Data structure returned by assemble — the caller (Publisher) maps this
 * to the Prisma ArticleCreateInput.
 */
export interface ArticleData {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  contentHtml: string;
  contentBlocks: string; // JSON string
  keywordId: number;
  trendId: number | null;
  wordCount: number;
  readingLevel: number;
  schemaMarkup: string; // JSON string
  internalLinks: string; // JSON array string
  externalLinks: string; // JSON array string
  status: string;
  generationAttempts: number;
  qualityScore: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ArticleBuilder
// ─────────────────────────────────────────────────────────────────────────────

class ArticleBuilder {
  private seoOptimizer: SEOOptimizer;
  private schemaBuilder: SchemaBuilder;
  private textAnalyzer: TextAnalyzer;

  constructor(
    seoOptimizer: SEOOptimizer,
    schemaBuilder: SchemaBuilder,
    textAnalyzer: TextAnalyzer,
  ) {
    this.seoOptimizer = seoOptimizer;
    this.schemaBuilder = schemaBuilder;
    this.textAnalyzer = textAnalyzer;
  }

  /**
   * Assembles all article data from the keyword, trend, content guide, and
   * AI-generated content into a single ArticleData object ready for the
   * Publisher service.
   */
  async assemble(
    keywordData: Keyword,
    trendData: Trend | null,
    guideData: GuideData,
    generatedContent: GeneratedContent,
  ): Promise<ArticleData> {
    // ── Slug ──────────────────────────────────────────────────────────────
    const slug = this.seoOptimizer.generateUrlSlug(generatedContent.title);

    // ── Title — use generated title, but ensure it contains the keyword ───
    let title = generatedContent.title;
    if (!title.toLowerCase().includes(keywordData.keyword.toLowerCase())) {
      title = await this.seoOptimizer.optimizeTitle(keywordData.keyword, title);
    }

    // ── HTML ──────────────────────────────────────────────────────────────
    const htmlMain = this.generateHtml(generatedContent.content_blocks);
    const htmlFaq = this.generateFaqHtml(generatedContent.faq);
    const htmlContent = htmlFaq ? `${htmlMain}\n${htmlFaq}` : htmlMain;

    // ── Meta description — use provided or generate one ───────────────────
    const metaDescription =
      generatedContent.meta_description ||
      this.seoOptimizer.generateMetaDescription(keywordData.keyword, htmlContent);

    // ── Content blocks as JSON string ─────────────────────────────────────
    const contentBlocksJson = JSON.stringify({
      blocks: generatedContent.content_blocks,
      faq: generatedContent.faq,
    });

    // ── Word count ────────────────────────────────────────────────────────
    const wordCount = this.countWords(htmlContent);

    // ── Reading level ─────────────────────────────────────────────────────
    const readingLevel = this.textAnalyzer.calculateReadingLevel(htmlContent);

    // ── Schema — merge generated schema with builder's schema; generated
    //    fields override builder defaults where they overlap. ──────────────
    const builderSchema = this.schemaBuilder.buildArticleSchema({
      title,
      slug,
      metaDescription,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const mergedSchema = { ...builderSchema, ...generatedContent.schema_markup };
    const schemaMarkupJson = JSON.stringify(mergedSchema);

    // ── External links (first 3 from guide opportunities) ─────────────────
    const externalLinks = guideData.externalLinkOpportunities.slice(0, 3);
    const externalLinksJson = JSON.stringify(externalLinks);

    // ── Internal links — empty placeholder, populated later by LinkManager ─
    const internalLinksJson = JSON.stringify([]);

    return {
      slug,
      title,
      metaDescription,
      h1: generatedContent.h1,
      contentHtml: htmlContent,
      contentBlocks: contentBlocksJson,
      keywordId: keywordData.id,
      trendId: trendData?.id ?? null,
      wordCount,
      readingLevel,
      schemaMarkup: schemaMarkupJson,
      internalLinks: internalLinksJson,
      externalLinks: externalLinksJson,
      status: 'draft',
      generationAttempts: 1,
      qualityScore: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTML generation helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Converts an array of ContentBlocks into an HTML string.
   */
  generateHtml(blocks: ContentBlock[]): string {
    return blocks
      .map((block) => {
        switch (block.type) {
          case 'h2':
            return `<h2>${this.escapeHtml(block.text || '')}</h2>`;

          case 'h3':
            return `<h3>${this.escapeHtml(block.text || '')}</h3>`;

          case 'p':
            return `<p>${this.escapeHtml(block.text || '')}</p>`;

          case 'ul':
            return `<ul>${(block.items || [])
              .map((item) => `<li>${this.escapeHtml(item)}</li>`)
              .join('')}</ul>`;

          case 'ol':
            return `<ol>${(block.items || [])
              .map((item) => `<li>${this.escapeHtml(item)}</li>`)
              .join('')}</ol>`;

          case 'blockquote': {
            const quote = `<p>${this.escapeHtml(block.text || '')}</p>`;
            const cite = block.source ? `<cite>${this.escapeHtml(block.source)}</cite>` : '';
            return `<blockquote>${quote}${cite}</blockquote>`;
          }

          case 'table': {
            const thead = block.headers?.length
              ? `<thead><tr>${block.headers
                  .map((h) => `<th>${this.escapeHtml(h)}</th>`)
                  .join('')}</tr></thead>`
              : '';
            const tbody = (block.rows || [])
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`,
              )
              .join('');
            return `<table>${thead}<tbody>${tbody}</tbody></table>`;
          }

          default:
            return '';
        }
      })
      .join('\n');
  }

  /**
   * Generates a "Frequently Asked Questions" HTML section from the FAQ array.
   */
  generateFaqHtml(faq: Array<{ question: string; answer: string }>): string {
    if (!faq || faq.length === 0) {
      return '';
    }

    const items = faq
      .map(
        (f) =>
          `<div class="faq-item"><h3>${this.escapeHtml(f.question)}</h3><p>${this.escapeHtml(f.answer)}</p></div>`,
      )
      .join('');

    return `<div class="faq-section"><h2>Frequently Asked Questions</h2>${items}</div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utility helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Counts words in a plain-text or HTML string (strips tags for accuracy).
   */
  private countWords(text: string): number {
    const stripped = text.replace(/<[^>]*>/g, '');
    const words = stripped.trim().split(/\s+/);
    return words.length === 1 && words[0] === '' ? 0 : words.length;
  }

  /**
   * Minimal HTML-escaping to prevent XSS in generated content.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default ArticleBuilder;
