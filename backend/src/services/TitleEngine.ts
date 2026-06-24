import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TitleTemplate {
  id: number;
  pattern: string;
  description: string;
}

export interface TitleData {
  keyword: string;
  angle?: string;
  number?: number;
  adjective?: string;
  topic?: string;
  year?: number;
  industry?: string;
  question?: string;
  location?: string;
  insight?: string;
}

export interface ScoredTitle {
  title: string;
  score: number;
  keywordPosition: number;
  charLength: number;
  ctrBoost: number;
}

export interface TitleOptions {
  intent?: string;
  category?: string;
  location?: string;
  year?: number;
  maxLength?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATES: TitleTemplate[] = [
  {
    id: 1,
    pattern: '[Keyword]: [Compelling Angle]',
    description: 'Default — high-volume keyword with a compelling angle',
  },
  {
    id: 2,
    pattern: '[Number] [Adjective] [Topic] [Year]',
    description: 'Listicle — numbered list with adjective modifier',
  },
  {
    id: 3,
    pattern: 'How [Keyword] Is Changing [Industry]',
    description: 'Trend/analysis — how a keyword is reshaping an industry',
  },
  {
    id: 4,
    pattern: '[Keyword] — Everything You Need to Know',
    description: 'Comprehensive guide — in-depth resource for a keyword',
  },
  {
    id: 5,
    pattern: "[Question about Keyword]? Here's What...",
    description: 'Question format — answers a common PAA-style query',
  },
  {
    id: 6,
    pattern: '[Location] [Topic]: [Local Insight]',
    description: 'Geo-targeted — localized topic with regional insight',
  },
];

const POWER_WORDS: string[] = [
  'Best',
  'Top',
  'Ultimate',
  'Essential',
  'Proven',
  'Expert',
  'Complete',
  'Insider',
  'Secret',
  'Exclusive',
  'Definitive',
  'Practical',
  'Actionable',
  'Critical',
  'Must-Know',
  'Game-Changing',
  'Breakthrough',
  'Innovative',
  'Powerful',
  'Strategic',
  'Quick',
  'Easy',
  'Simple',
  'Effective',
  'Comprehensive',
  'In-Depth',
  'Authoritative',
  'Trusted',
  'Amazing',
  'Incredible',
];

const LISTLIKE_CATEGORIES = new Set([
  'best-of',
  'reviews',
  'comparisons',
  'buying-guides',
  'gear',
  'tools',
  'products',
  'software',
  'apps',
  'resources',
]);

const QUESTION_WORDS = [
  'what',
  'how',
  'why',
  'when',
  'where',
  'who',
  'which',
  'is',
  'are',
  'can',
  'does',
  'do',
  'will',
  'should',
];

const COMPREHENSIVE_KEYWORD_MIN_WORDS = 3;

// ---------------------------------------------------------------------------
// TitleEngine
// ---------------------------------------------------------------------------

class TitleEngine {
  /**
   * Analyse keyword, intent, and category to determine the best title template.
   */
  selectTemplate(keyword: string, intent?: string, category?: string): TitleTemplate {
    const lowerKeyword = keyword.toLowerCase().trim();
    const best = this.pickBestTemplate(lowerKeyword, intent, category);
    const template = TEMPLATES.find((t) => t.id === best.id);
    if (!template) {
      throw new AppError('E005', `Template id ${best.id} not found`, 500);
    }
    return template;
  }

  /**
   * Apply a template pattern by replacing placeholders with the provided data.
   */
  applyTemplate(template: TitleTemplate, data: TitleData): string {
    let title = template.pattern;

    title = title.replace('[Keyword]', data.keyword);
    title = title.replace('[Compelling Angle]', data.angle ?? this.defaultAngle(data.keyword));
    title = title.replace('[Number]', String(data.number ?? this.defaultNumber()));
    title = title.replace('[Adjective]', data.adjective ?? this.randomPowerWord());
    title = title.replace('[Topic]', data.topic ?? data.keyword);
    title = title.replace('[Year]', String(data.year ?? new Date().getFullYear()));
    title = title.replace('[Industry]', data.industry ?? this.defaultIndustry(data.keyword));
    title = title.replace(
      '[Question about Keyword]',
      data.question ?? this.defaultQuestion(data.keyword),
    );
    title = title.replace("[Here's What...]", "Here's What You Need to Know");
    title = title.replace('[Location]', data.location ?? '');
    title = title.replace('[Local Insight]', data.insight ?? this.defaultInsight(data.keyword));

    // Clean up any double spaces or leading/trailing whitespace
    title = title.replace(/\s+/g, ' ').trim();

    // Remove leading colon or dash if location was empty in template 6
    title = title.replace(/^[:,\s-]+/, '').trim();

    return title;
  }

  /**
   * Score a generated title based on keyword position, character length,
   * sentiment (placeholder), and CTR-boosting elements.
   */
  scoreTitle(title: string, keyword: string): ScoredTitle {
    const lowerTitle = title.toLowerCase();
    const lowerKeyword = keyword.toLowerCase().trim();

    // --- Keyword position (0-40 points) ---
    const keywordIndex = lowerTitle.indexOf(lowerKeyword);
    const keywordPosition =
      keywordIndex >= 0 ? Math.round((keywordIndex / title.length) * 100) : -1;

    let keywordScore = 0;
    if (keywordPosition >= 0) {
      if (keywordPosition <= 25) {
        keywordScore = 40;
      } else if (keywordPosition <= 50) {
        keywordScore = 30;
      } else if (keywordPosition <= 75) {
        keywordScore = 20;
      } else {
        keywordScore = 10;
      }
    }

    // --- Character length (0-25 points) ---
    const charLength = title.length;
    let lengthScore = 0;
    if (charLength >= 50 && charLength <= 65) {
      lengthScore = 25;
    } else if (charLength >= 40 && charLength <= 75) {
      lengthScore = 15;
    } else if (charLength >= 30 && charLength <= 85) {
      lengthScore = 10;
    } else if (charLength >= 20 && charLength <= 100) {
      lengthScore = 5;
    }

    // --- Sentiment match (0-15 points) — placeholder for future analysis ---
    const sentimentScore = 0;

    // --- CTR likelihood (0-20 points) ---
    let ctrBoost = 0;

    // Numbers boost
    if (/\d/.test(title)) ctrBoost += 5;

    // Power words boost
    const matchedPowerWords = POWER_WORDS.filter((w) =>
      lowerTitle.includes(w.toLowerCase()),
    ).length;
    ctrBoost += Math.min(matchedPowerWords, 1) * 5; // max 5

    // Question mark boost
    if (title.includes('?')) ctrBoost += 10;

    // Brackets boost
    if (/\(.*?\)|\[.*?\]/.test(title)) ctrBoost += 5;

    // Cap at 20
    ctrBoost = Math.min(ctrBoost, 20);

    const totalScore = keywordScore + lengthScore + sentimentScore + ctrBoost;

    return {
      title,
      score: totalScore,
      keywordPosition,
      charLength,
      ctrBoost,
    };
  }

  /**
   * Generate N scored titles sorted best-first.
   *
   * Selects a primary template based on keyword/intent/category, then adds
   * fallback templates for variety. Each template is applied, scored, and
   * results are returned in descending score order.
   */
  generateTitles(keyword: string, count: number = 5, options?: TitleOptions): ScoredTitle[] {
    if (!keyword || keyword.trim().length === 0) {
      throw new AppError('E012', 'Keyword is required to generate titles', 400);
    }

    const safeCount = Math.min(Math.max(count, 1), 10);
    const intent = options?.intent;
    const category = options?.category;

    // Determine primary template
    const primaryTemplate = this.selectTemplate(keyword, intent, category);

    // Build ordered set of templates for variety
    const templateOrder: number[] = [primaryTemplate.id];
    for (const id of TEMPLATES.map((t) => t.id)) {
      if (templateOrder.length >= safeCount) break;
      if (!templateOrder.includes(id)) {
        templateOrder.push(id);
      }
    }

    const selectedTemplates = templateOrder
      .map((id) => TEMPLATES.find((t) => t.id === id))
      .filter((t): t is TitleTemplate => t !== undefined);

    const results: ScoredTitle[] = [];

    for (const template of selectedTemplates) {
      const data = this.buildTitleData(keyword, template, options);
      const title = this.applyTemplate(template, data);

      if (options?.maxLength && title.length > options.maxLength) continue;

      const scored = this.scoreTitle(title, keyword);
      results.push(scored);
    }

    // Sort descending by score, break ties by earliest keyword position
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.keywordPosition - b.keywordPosition;
    });

    return results.slice(0, safeCount);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Determine the optimal template id using heuristics for intent, category,
   * and keyword structure.
   */
  private pickBestTemplate(keyword: string, intent?: string, category?: string): { id: number } {
    const lowerKeyword = keyword.toLowerCase().trim();
    const lowerCategory = category?.toLowerCase() ?? '';

    // Template 3 — news intent
    if (intent === 'news') return { id: 3 };

    // Template 2 — informational intent + listlike category or keyword suggests lists
    if (intent === 'informational' && LISTLIKE_CATEGORIES.has(lowerCategory)) {
      return { id: 2 };
    }
    if (intent === 'informational' && /\b(best|top)\b/.test(lowerKeyword)) {
      return { id: 2 };
    }

    // Template 5 — keyword reads as a question (proxy for PAA)
    if (QUESTION_WORDS.some((w) => lowerKeyword.startsWith(w))) {
      return { id: 5 };
    }

    // Template 4 — informational with multi-word keyword (comprehensive guide)
    if (
      intent === 'informational' &&
      lowerKeyword.split(/\s+/).length >= COMPREHENSIVE_KEYWORD_MIN_WORDS
    ) {
      return { id: 4 };
    }

    // Template 6 — location is present (handled via options in generateTitles,
    // but we check category name for geo clues)
    if (
      lowerCategory.includes('-city') ||
      lowerCategory.includes('-region') ||
      lowerCategory.includes('local')
    ) {
      return { id: 6 };
    }

    // Default — template 1
    return { id: 1 };
  }

  /**
   * Construct TitleData for a given template and keyword, extracting whatever
   * information is available from the keyword string and options.
   */
  private buildTitleData(
    keyword: string,
    template: TitleTemplate,
    options?: TitleOptions,
  ): TitleData {
    const year = options?.year ?? new Date().getFullYear();

    const data: TitleData = {
      keyword,
      year,
      location: options?.location,
      angle: this.extractAngle(keyword),
      adjective: this.randomPowerWord(),
      number: this.extractNumber(keyword, template),
      topic: keyword,
      industry: this.defaultIndustry(keyword),
      question: this.defaultQuestion(keyword),
      insight: this.defaultInsight(keyword),
    };

    return data;
  }

  /**
   * Derive a compelling angle from the keyword itself (e.g. the words after
   * the first noun phrase).
   */
  private extractAngle(keyword: string): string {
    const words = keyword.split(/\s+/);
    if (words.length <= 2) {
      return `A Complete Guide to ${keyword}`;
    }
    return words.slice(1).join(' ');
  }

  /**
   * Pick a number for listicle templates. Try to detect one already in the
   * keyword; otherwise default to a high-performing odd number.
   */
  private extractNumber(keyword: string, template: TitleTemplate): number {
    if (template.id !== 2) return this.defaultNumber();

    const numberMatch = keyword.match(/\b(\d+)\b/);
    if (numberMatch) {
      const parsed = parseInt(numberMatch[1], 10);
      if (parsed >= 3 && parsed <= 100) return parsed;
    }

    return this.defaultNumber();
  }

  /**
   * Attempt to infer an industry from the keyword by looking at the last word
   * or two.
   */
  private defaultIndustry(keyword: string): string {
    const topicWords = ['guide', 'tips', 'strategies', 'ideas', 'trends', 'examples'];
    const words = keyword.split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() ?? '';

    if (topicWords.includes(lastWord)) {
      return words.slice(0, -1).join(' ') || keyword;
    }

    return keyword;
  }

  /**
   * Build a default question from the keyword for question-format templates.
   */
  private defaultQuestion(keyword: string): string {
    const lower = keyword.toLowerCase().trim();

    if (QUESTION_WORDS.some((w) => lower.startsWith(w))) {
      // Already begins with a question word — capitalise first letter
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }

    const articles = ['a', 'an', 'the'];
    const firstArticle = articles.find((a) => lower.startsWith(a));
    const rest = firstArticle ? keyword.slice(firstArticle.length).trim() : keyword;

    return `Is ${rest} Right for You`;
  }

  /**
   * Generate a generic local insight.
   */
  private defaultInsight(keyword: string): string {
    return `What ${keyword} Means for Your Area`;
  }

  /**
   * Default angle for a keyword when no specific angle is provided.
   */
  private defaultAngle(keyword: string): string {
    const words = keyword.split(/\s+/);
    if (words.length <= 1) {
      return 'What You Need to Know';
    }
    return words.slice(1).join(' ');
  }

  /**
   * Return a default list size weighted toward numbers that tend to perform
   * well in click-through tests (odd numbers under 15).
   */
  private defaultNumber(): number {
    const preferred = [7, 5, 10, 3, 12, 15, 21, 25];
    return preferred[Math.floor(Math.random() * preferred.length)];
  }

  /**
   * Pick a random power word from the list.
   */
  private randomPowerWord(): string {
    return POWER_WORDS[Math.floor(Math.random() * POWER_WORDS.length)];
  }
}

export default TitleEngine;
