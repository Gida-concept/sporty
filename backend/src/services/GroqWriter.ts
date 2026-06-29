import { AppError } from '../middleware/errorHandler.js';
import GroqAPI from '../lib/GroqAPI.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentBlockType = 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'table';

export interface ContentBlock {
  type: ContentBlockType;
  text?: string;
  items?: string[];
  source?: string;
  headers?: string[];
  rows?: string[][];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface GeneratedContent {
  title: string;
  meta_description: string;
  h1: string;
  content_blocks: ContentBlock[];
  faq: FAQItem[];
  schema_markup: Record<string, unknown>;
  suggested_images: Array<{ description: string; alt_text: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

/**
 * Banned phrases the system prompt explicitly forbids to prevent AI slop.
 * Drawn from the content-quality.md anti-slop rules.
 */
const BANNED_PHRASES = [
  // Generic openers
  '"In today\'s digital age..."',
  '"In today\'s world..."',
  '"In the world of sports..."',
  '"In today\'s entertainment news..."',
  '"In this article, we will..."',
  '"Welcome to our guide on..."',
  // Filler phrases
  '"It is important to note that..."',
  '"It is worth mentioning that..."',
  '"It goes without saying that..."',
  '"As we have seen..."',
  '"As mentioned earlier..."',
  '"Needless to say..."',
  '"It should be noted that..."',
  // Conclusion cliches
  '"In conclusion..."',
  '"To sum up..."',
  '"In summary..."',
  '"In closing..."',
  '"To wrap things up..."',
  // AI hallucination markers
  '"The landscape of..."',
  '"A tapestry of..."',
  '"Delve into..."',
  '"Multifaceted..."',
  '"Leverage..."',
  '"Robust..."',
  '"Game-changer..."',
  '"Revolutionary..."',
  '"In the ever-evolving world of..."',
  '"In the rapidly changing landscape of..."',
  '"It\'s a complex and nuanced topic..."',
  // Overused AI modifiers
  '"Truly..."',
  '"Essentially..."',
  '"Basically..."',
  '"Importantly..."',
  '"Interestingly..."',
  '"Notably..."',
  '"Significantly..."',
  '"Crucially..."',
  '"Undoubtedly..."',
];

// ---------------------------------------------------------------------------
// GroqWriter
// ---------------------------------------------------------------------------

class GroqWriter {
  private groqAPI: GroqAPI;

  constructor(groqAPI: GroqAPI) {
    this.groqAPI = groqAPI;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate a full article from a Content Guide.
   *
   * Builds a structured system prompt that instructs Groq to write an
   * article following the content guide's narrative angle, data points,
   * section blueprint, and quality rules.  Validates the JSON output and
   * retries up to 3 times on validation failure.
   */
  async generateArticle(contentGuide: Record<string, unknown>): Promise<GeneratedContent> {
    const systemPrompt = this._buildSystemPrompt();
    const userPrompt = JSON.stringify(contentGuide, null, 2);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await this._sleep(RETRY_DELAY_MS);
      }

      try {
        const rawOutput = await this.groqAPI.generateStructured<GeneratedContent>(
          {
            systemPrompt,
            userPrompt,
          },
          attempt,
        );

        if (this.validateOutput(rawOutput)) {
          return rawOutput;
        }

        lastError = new AppError(
          'E003',
          `Generated article failed validation (attempt ${attempt + 1}/${MAX_RETRIES})`,
          500,
        );
      } catch (err) {
        // Attempt to salvage malformed JSON if we get a parse failure
        if (err instanceof AppError && err.code === 'E003') {
          lastError = err;
          continue;
        }

        // Re-throw unexpected errors (network, auth, rate-limit, etc.)
        throw err;
      }
    }

    // All retries exhausted
    throw (
      lastError ?? new AppError('E003', 'Failed to generate a valid article after all retries', 500)
    );
  }

  /**
   * Type guard that validates a `GeneratedContent` object.
   *
   * Uses lenient field-name normalization to accommodate variations that
   * different Llama models return (snake_case vs camelCase, alternate key
   * names).  Accepts any article-shaped JSON rather than failing on exact
   * field matches.
   *
   * Normalisations applied:
   * - `title` falls back to `headline` or any key containing "title"
   * - `meta_description` falls back to `description`, `summary`, `excerpt`
   * - `content_blocks` accepted at any length >= 1 (previously required >= 3)
   * - `h1` checked loosely
   */
  validateOutput(json: unknown): json is GeneratedContent {
    if (typeof json !== 'object' || json === null) {
      return false;
    }

    const obj = json as Record<string, unknown>;

    // ---- Flexible title resolution ----
    const title = this._flexField(obj, 'title', ['headline']);
    if (!title) return false;
    obj.title = title;

    // ---- Flexible meta_description resolution ----
    const metaDescription = this._flexField(obj, 'meta_description', [
      'description',
      'summary',
      'excerpt',
    ]);
    if (metaDescription) {
      obj.meta_description = metaDescription;
    } else {
      // Auto-generate from first content block
      const blocks = this._flexArray(obj, 'content_blocks', ['contentBlocks', 'blocks']);
      const excerpt =
        blocks && blocks.length > 0 && typeof blocks[0] === 'object' && blocks[0] !== null
          ? ((blocks[0] as Record<string, unknown>).text as string | undefined)
          : undefined;
      if (excerpt) {
        obj.meta_description = excerpt.slice(0, 160);
      } else {
        return false;
      }
    }

    // ---- Flexible content_blocks resolution ----
    const contentBlocks = this._flexArray(obj, 'content_blocks', ['contentBlocks', 'blocks']);
    if (!contentBlocks || contentBlocks.length === 0) {
      return false;
    }
    obj.content_blocks = contentBlocks;

    // ---- Per-block validation (lenient — skip malformed blocks) ----
    // Filter out clearly invalid blocks, keep anything reasonable
    const validBlocks = contentBlocks.filter((block: unknown) => {
      if (typeof block !== 'object' || block === null) return false;
      const b = block as Record<string, unknown>;
      if (typeof b.type !== 'string') return false;
      const validTypes = ['h2', 'h3', 'p', 'ul', 'ol', 'blockquote', 'table'];
      if (!validTypes.includes(b.type as string)) return false;
      return true;
    });

    // Accept whatever survived (even 1 block is OK)
    obj.content_blocks = validBlocks.length > 0 ? validBlocks : contentBlocks;

    return true;
  }

  /**
   * Attempt to salvage malformed JSON from Groq's raw string output.
   *
   * Steps:
   * 1. Strip any markdown code fences (```json / ```)
   * 2. Try `JSON.parse`
   * 3. If that fails, attempt to extract the first JSON object via regex
   * 4. If all fail, throw AppError E003
   */
  fixMalformedJson(raw: string): unknown {
    // Strip code fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/gm, '')
      .replace(/\s*```$/gm, '')
      .trim();

    // Attempt direct parse first
    try {
      return JSON.parse(cleaned);
    } catch {
      // Fall through to regex extraction
    }

    // Try to extract a JSON object / array from the string
    const jsonMatch = cleaned.match(/\{.*\}/s);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through to error
      }
    }

    throw new AppError('E003', 'Failed to parse malformed JSON from Groq response', 500);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Flexible field getter: returns `obj[key]` if it is a non-empty string,
   * otherwise tries each `fallbackKeys` in order, then searches for any key
   * containing `key` (case-insensitive).
   *
   * Returns the value if found, or `null` if no suitable field exists.
   */
  private _flexField(
    obj: Record<string, unknown>,
    key: string,
    fallbackKeys: string[] = [],
  ): string | null {
    // Primary key
    const primary = obj[key];
    if (typeof primary === 'string' && primary.trim().length > 0) return primary;

    // Explicit fallbacks
    for (const fb of fallbackKeys) {
      const val = obj[fb];
      if (typeof val === 'string' && val.trim().length > 0) {
        return val;
      }
    }

    // Also check camelCase variation of the primary key
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (camelKey !== key) {
      const camel = obj[camelKey];
      if (typeof camel === 'string' && camel.trim().length > 0) return camel;
    }

    // Fuzzy search: any key containing the base name
    const baseName = key.replace(/_/g, '').toLowerCase();
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes(baseName) && typeof v === 'string' && v.trim().length > 0) {
        return v;
      }
    }

    return null;
  }

  /**
   * Flexible array getter: returns `obj[key]` if it is a non-empty array,
   * otherwise tries each `fallbackKeys` in order, then checks for a camelCase
   * variant of the primary key.
   *
   * Returns the array if found, or `null`.
   */
  private _flexArray(
    obj: Record<string, unknown>,
    key: string,
    fallbackKeys: string[] = [],
  ): unknown[] | null {
    if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];

    for (const fb of fallbackKeys) {
      if (Array.isArray(obj[fb]) && obj[fb].length > 0) return obj[fb];
    }

    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (camelKey !== key && Array.isArray(obj[camelKey]) && obj[camelKey].length > 0) {
      return obj[camelKey];
    }

    return null;
  }

  /**
   * Build the system prompt that sets Groq's role and enforces all content
   * guide rules — narrative angle, section blueprint, banned phrases, etc.
   *
   * The prompt forces JSON output following the `GeneratedContent` schema,
   * with the target word count of 800-1500 words.
   */
  private _buildSystemPrompt(): string {
    const bannedList = BANNED_PHRASES.join('\n    - ');

    return [
      'You are an expert sports and entertainment journalist. Your writing is sharp, original, and data-driven. ' +
        'You NEVER write generic summaries. You provide original analysis, context, and forward-looking insight.',
      '',
      'You will receive a Content Guide encoded as a JSON object. You MUST follow it exactly:',
      '',
      '1. **Narrative Angle** — This is MANDATORY. Every paragraph must serve the specified angle. ' +
        'If you write a generic summary instead of following the narrative angle, you will be regenerated.',
      '',
      '2. **Data Points** — You MUST include at least 3 specific statistics, dates, or quotes from ' +
        "the provided data points (from the Content Guide's DATA POINTS TO INCLUDE section). " +
        'Every claim should reference a data point. Historical context is allowed but must be clearly ' +
        'marked and cannot exceed 20% of the article.',
      '',
      '3. **Section Blueprint** — Follow the section structure precisely (Hook, Context, Deep Dive, ' +
        'Implications, Expert Take, FAQ). Do not deviate from the blueprint order or omit sections.',
      '',
      '4. **Target Length** — 800-1500 words total across all content_blocks.',
      '',
      '5. **Tone** — Authoritative but conversational. Write at a Flesch-Kincaid 8th-9th grade reading level. ' +
        'Short paragraphs (2-4 sentences max). Active voice preferred. Never use passive voice for more ' +
        'than 20% of sentences.',
      '',
      '6. **Forbidden Phrases** — You must NEVER use any of these banned AI slop phrases:',
      '    - ' + bannedList,
      '',
      '7. **No Summaries** — Do not summarize Wikipedia or existing articles. Do not list basic facts ' +
        'without analysis or context. Do not start with a question ("Have you ever wondered...").',
      '',
      '8. **SEO Title Constraint** — The `title` field must be 50-60 characters and include the primary keyword.',
      '',
      '9. **Meta Description** — The `meta_description` field must be 150-160 characters, include the ' +
        'primary keyword, and end with a compelling call to action.',
      '',
      '10. **Schema Markup** — Populate `schema_markup` with valid JSON-LD structured data appropriate ' +
        'to the article type (e.g., NewsArticle, Article, ProfilePage). Include at minimum ' +
        '@context, @type, headline, datePublished, author, publisher, and mainEntityOfPage.',
      '',
      '11. **Images** — For each `suggested_image`, provide a realistic description and keyword-rich ' +
        'alt text under 125 characters.',
      '',
      '12. **Output Format** — Respond ONLY with a valid JSON object matching this schema. ' +
        'No markdown, no explanatory text, no code fences. The JSON must have these top-level keys: ' +
        'title, meta_description, h1, content_blocks, faq, schema_markup, suggested_images.',
    ].join('\n');
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default GroqWriter;
