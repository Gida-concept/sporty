// No project imports needed - this is a pure utility class

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'news'
  | 'comparison'
  | 'listicle'
  | 'how-to';

export interface TitleTemplate {
  formula: string;
  example: string;
  appliesTo: SearchIntent[];
}

export type ContentBlock = {
  type: 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'table';
  text?: string;
  items?: string[];
  source?: string;
  headers?: string[];
  rows?: string[][];
};

const POWER_WORDS = [
  'Ultimate',
  'Complete',
  'Essential',
  'Proven',
  'Updated',
  'Exclusive',
  'Best',
  'Top',
  'Expert',
  'Insider',
  'Definitive',
  'Comprehensive',
  'Ultimate',
  'Unmissable',
  'Critical',
  'Important',
  'Necessary',
];

const EMOTIONAL_WORDS = [
  'Shocking',
  'Surprising',
  'Revealed',
  'Unbelievable',
  'Heartbreaking',
  'Triumphant',
  'Controversial',
  'Incredible',
  'Dramatic',
  'Stunning',
];

const TITLE_TEMPLATES: TitleTemplate[] = [
  {
    formula: '[Number] [Power Word] Ways to [Keyword] in [Year]',
    example: '7 Proven Ways to Improve Your NBA Fantasy Draft in 2026',
    appliesTo: ['informational'],
  },
  {
    formula: '[Keyword]: [Power Word] Guide for [Audience] ([Year])',
    example: 'Best Streaming Services for Sports: Complete Guide for Cord-Cutters (2026)',
    appliesTo: ['commercial'],
  },
  {
    formula: '[Keyword] [Update/News]: What We Know [Timeframe]',
    example: 'LeBron James Injury Update: What We Know This Week',
    appliesTo: ['news'],
  },
  {
    formula: '[Keyword] vs [Rival]: [Power Word] Comparison ([Year])',
    example: 'Lakers vs Celtics 2026: Complete Head-to-Head Breakdown',
    appliesTo: ['comparison'],
  },
  {
    formula: "[Number] [Power Word] [Keyword] You Can't Miss ([Year])",
    example: "10 Best Sports Documentaries on Netflix You Can't Miss (2026)",
    appliesTo: ['listicle'],
  },
  {
    formula: 'How to [Keyword]: [Power Word] Guide ([Year])',
    example: 'How to Watch Premier League in USA: Complete Guide (2026)',
    appliesTo: ['how-to'],
  },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

class SEOOptimizer {
  /**
   * Generate an SEO-optimized title for the given keyword and category.
   * Uses intent-aligned templates, fills placeholders, scores variations,
   * and returns the highest-scoring title capped at 60 characters.
   */
  optimizeTitle(keyword: string, category: string, intent?: SearchIntent): string {
    const year = new Date().getFullYear().toString();
    const audiences = ['Fans', 'Viewers'];
    const timeframes = ['This Week', 'Today'];
    const rivals = ['Top Competitor'];

    // Filter templates by intent if provided, otherwise use all
    const candidates = intent
      ? TITLE_TEMPLATES.filter((t) => t.appliesTo.includes(intent))
      : TITLE_TEMPLATES;

    if (candidates.length === 0) {
      return `${keyword}: Essential Guide`.substring(0, 60);
    }

    const variations: string[] = [];

    for (let i = 0; i < 3; i++) {
      const template = pickRandom(candidates);
      let title = template.formula;

      title = title.replace('[Number]', randomInt(3, 10).toString());
      title = title.replace('[Power Word]', pickRandom(POWER_WORDS));
      title = title.replace('[Keyword]', keyword);
      title = title.replace('[Year]', year);
      title = title.replace('[Audience]', pickRandom(audiences));
      title = title.replace('[Timeframe]', pickRandom(timeframes));
      title = title.replace('[Rival]', pickRandom(rivals));
      // Remove any remaining template tokens not replaced
      title = title
        .replace(/\[.*?\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      variations.push(title);
    }

    let bestTitle = variations[0];
    let bestScore = -1;

    for (const title of variations) {
      let score = 0;

      // Keyword in first 60 chars: +30
      if (
        title.toLowerCase().includes(keyword.toLowerCase()) &&
        title.toLowerCase().indexOf(keyword.toLowerCase()) < 60
      ) {
        score += 30;
      }

      // Power word present: +10 per word (max +30)
      const powerWordsFound = POWER_WORDS.filter((pw) =>
        title.toLowerCase().includes(pw.toLowerCase()),
      ).length;
      score += Math.min(powerWordsFound, 3) * 10;

      // Year present: +15
      if (title.includes(year)) {
        score += 15;
      }

      // Length 50-60 chars: +15
      if (title.length >= 50 && title.length <= 60) {
        score += 15;
      }

      // Emotional trigger word: +10
      const hasEmotional = EMOTIONAL_WORDS.some((ew) =>
        title.toLowerCase().includes(ew.toLowerCase()),
      );
      if (hasEmotional) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTitle = title;
      }
    }

    // Cap to 60 chars, truncating at last space to avoid cutting words
    if (bestTitle.length > 60) {
      const truncated = bestTitle.substring(0, 60);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        bestTitle = truncated.substring(0, lastSpace);
      } else {
        bestTitle = truncated;
      }
    }

    return bestTitle.trim();
  }

  /**
   * Generate a meta description from content for the given keyword.
   * Ensures the keyword appears in the description, prepending a sentence
   * if necessary, adds a CTA if room allows, and respects maxLength.
   */
  generateMetaDescription(keyword: string, content: string, maxLength: number = 160): string {
    const lowerContent = content.toLowerCase();

    // Find where keyword first appears
    const keywordIndex = lowerContent.indexOf(keyword.toLowerCase());

    if (keywordIndex >= 0 && keywordIndex < 200) {
      // Keyword is within first 200 chars - extract leading portion up to maxLength
      let description = content.substring(0, maxLength);
      // Truncate at last space to avoid cutting words, but only if we hit the limit
      if (description.length === maxLength) {
        const lastSpace = description.lastIndexOf(' ');
        if (lastSpace > 30) {
          description = description.substring(0, lastSpace);
        }
      }
      return this.appendCta(description, maxLength);
    }

    // Keyword not found near the beginning — find its actual position
    if (keywordIndex >= 0) {
      // Extract starting a bit before the keyword to give context
      const start = Math.max(0, keywordIndex - 20);
      let description = content.substring(start, start + maxLength);
      if (description.length === maxLength) {
        const lastSpace = description.lastIndexOf(' ');
        if (lastSpace > 0) {
          description = description.substring(0, lastSpace);
        }
      }
      return this.appendCta(description, maxLength);
    }

    // Keyword not found in content at all — prepend a sentence
    const prefix = `Learn about ${keyword} and more. `;
    if (prefix.length >= maxLength) {
      return prefix.substring(0, maxLength);
    }
    const remaining = maxLength - prefix.length;
    let suffix = content.substring(0, remaining);
    if (suffix.length === remaining) {
      const lastSpace = suffix.lastIndexOf(' ');
      if (lastSpace > 0) {
        suffix = suffix.substring(0, lastSpace);
      }
    }
    let description = prefix + suffix;
    return this.appendCta(description, maxLength);
  }

  /**
   * Append a CTA-like ending if there is room within maxLength.
   */
  private appendCta(text: string, maxLength: number): string {
    const cta = ', read more';
    if (text.length + cta.length <= maxLength) {
      return (text + cta).trim();
    }
    // Try to make room by truncating slightly
    const trimmed = text.substring(0, maxLength - cta.length);
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > 20) {
      return trimmed.substring(0, lastSpace) + cta;
    }
    return text.trim().substring(0, maxLength);
  }

  /**
   * Validate that the heading structure of content blocks is SEO-compliant:
   * - At least one H2 present as section heading
   * - No heading level is skipped (h2 -> h4 is forbidden)
   * - Keyword appears in at least one H2 or H3
   * - No more than 1 h2 per 3 content blocks
   */
  validateHeadings(blocks: ContentBlock[], keyword: string): boolean {
    const headings = blocks.filter((b) => b.type === 'h2' || b.type === 'h3');

    // At least one H2 present
    const h2Count = headings.filter((b) => b.type === 'h2').length;
    if (h2Count === 0) {
      return false;
    }

    // Check no heading level is skipped by iterating through headings in order
    let lastLevel: number | null = null;
    for (const block of blocks) {
      if (block.type === 'h2' || block.type === 'h3') {
        const currentLevel = block.type === 'h2' ? 2 : 3;
        if (lastLevel !== null && currentLevel > lastLevel + 1) {
          return false;
        }
        lastLevel = currentLevel;
      }
    }

    // Keyword appears in at least one H2 or H3
    const keywordInHeading = headings.some((h) =>
      (h.text ?? '').toLowerCase().includes(keyword.toLowerCase()),
    );
    if (!keywordInHeading) {
      return false;
    }

    // No more than 1 h2 per 3 content blocks
    const totalBlocks = blocks.length;
    if (h2Count > Math.ceil(totalBlocks / 3)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate keyword density as a percentage.
   * Target range: 1-2% for primary keywords.
   */
  checkKeywordDensity(content: string, keyword: string): number {
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    // Count occurrences of the keyword
    let occurrences = 0;
    let idx = 0;
    while ((idx = lowerContent.indexOf(lowerKeyword, idx)) !== -1) {
      occurrences++;
      idx += lowerKeyword.length;
    }

    if (occurrences === 0) {
      return 0;
    }

    // Count total words
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const totalWords = words.length;

    if (totalWords === 0) {
      return 0;
    }

    return parseFloat(((occurrences / totalWords) * 100).toFixed(2));
  }

  /**
   * Generate a URL-friendly slug from a title.
   * Lowercases, replaces non-alphanumeric chars with hyphens,
   * removes consecutive hyphens, trims, and limits to 60 chars.
   */
  generateUrlSlug(title: string): string {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length > 60) {
      // Truncate and clean again to avoid trailing hyphen
      slug = slug.substring(0, 60).replace(/-+$/g, '');
    }

    return slug;
  }
}

export default SEOOptimizer;
