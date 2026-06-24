import { AppError } from '@/middleware/errorHandler.js';
import SerpAPI, { SearchResult, NewsResult, RelatedQuestion } from '@/lib/SerpAPI.js';
import {
  PrismaClient,
  Keyword as PrismaKeyword,
  Trend,
  ContentGuide as PrismaContentGuide,
} from '@prisma/client';

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
  [key: string]: unknown;
}

const MAX_SUBHEADINGS = 10;
const MIN_DATAPOINTS = 2;

class ContentGuide {
  private serpAPI: SerpAPI;
  private prisma: PrismaClient;

  constructor(serpAPI: SerpAPI, prisma?: PrismaClient) {
    this.serpAPI = serpAPI;
    this.prisma = prisma ?? new PrismaClient();
  }

  /**
   * Generate a structured content guide for the given keyword and trend data.
   * Constructs the guide by analyzing SERP results, news data, and related questions.
   * Returns the guide data object without persisting it. Call save() to persist.
   */
  async generate(keyword: PrismaKeyword, trendData: Trend): Promise<GuideData> {
    const [searchResults, newsResults, relatedQuestions] = await Promise.all([
      this.serpAPI.getSearchResults(keyword.keyword),
      this.serpAPI.getNewsResults(keyword.keyword),
      this.serpAPI.getRelatedQuestions(keyword.keyword),
    ]);

    const searchIntent = this.inferSearchIntent(searchResults);
    const articleType = this.determineArticleType(trendData, searchResults);
    const avgWordCount = this.calculateAverageWordCount(searchResults);
    const commonSubheadings = this.extractSubheadings(searchResults);
    const contentGaps = this.identifyContentGaps(searchResults);
    const featuredSnippetFormat = this.detectFeaturedSnippetFormat(searchResults);
    const paaQuestions = relatedQuestions.map((q: RelatedQuestion) => q.question);
    const dataPoints = this.extractDataPoints(newsResults, searchResults);
    const narrativeAngle = this.determineNarrativeAngle(newsResults, trendData);
    const sectionBlueprint = this.buildSectionBlueprint(
      commonSubheadings,
      contentGaps,
      articleType,
    );
    const forbiddenPatterns = this.buildForbiddenPatterns();
    const internalLinkOpportunities = this.findInternalLinkOpportunities(keyword);
    const externalLinkOpportunities = this.findExternalLinkOpportunities(searchResults);

    const guide: GuideData = {
      guideId: `guide-${trendData.id}-${Date.now()}`,
      targetKeyword: keyword.keyword,
      secondaryKeywords: keyword.modifier ? [keyword.modifier] : [],
      searchIntent,
      articleType,
      targetWordCount: this.determineTargetWordCount(avgWordCount, articleType),
      readingLevel: 'intermediate',
      serpAnalysis: {
        avgWordCount,
        commonSubheadings,
        contentGaps,
        featuredSnippetFormat,
        paaQuestions,
      },
      dataPoints,
      narrativeAngle,
      sectionBlueprint,
      forbiddenPatterns,
      internalLinkOpportunities,
      externalLinkOpportunities,
    };

    this.validateGuide(guide);

    return guide;
  }

  /**
   * Persist a generated guide to the database, linked to an existing article.
   * Uses upsert to handle the unique constraint on articleId.
   */
  async save(articleId: string, keywordId: string, guide: GuideData): Promise<PrismaContentGuide> {
    const saved = await this.prisma.contentGuide.upsert({
      where: { articleId },
      update: {
        keywordId,
        guideData: JSON.parse(JSON.stringify(guide)),
      },
      create: {
        articleId,
        keywordId,
        guideData: JSON.parse(JSON.stringify(guide)),
      },
    });

    return saved;
  }

  /**
   * Extract common subheading patterns from SERP result snippets.
   * Analyzes result titles and snippet structures to identify headings
   * that appear frequently across competing content.
   */
  extractSubheadings(serpResults: SearchResult[]): string[] {
    const headingPatterns = new Map<string, number>();

    for (const result of serpResults) {
      const title = result.title?.toLowerCase() ?? '';
      const snippet = result.snippet?.toLowerCase() ?? '';

      const candidates = this.extractHeadingCandidates(title, snippet);

      for (const candidate of candidates) {
        headingPatterns.set(candidate, (headingPatterns.get(candidate) ?? 0) + 1);
      }
    }

    const sorted = [...headingPatterns.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([heading]) => heading)
      .slice(0, MAX_SUBHEADINGS);

    return sorted;
  }

  /**
   * Identify content gaps — topics competitors are not covering.
   * Analyzes competitor subheadings for positional gaps and returns
   * topics that are missing from the SERP landscape.
   */
  identifyContentGaps(competitorData: SearchResult[]): string[] {
    const coveredTopics = new Set<string>();
    const commonPhrases = [
      'what is',
      'how to',
      'benefits',
      'cost',
      'pricing',
      'alternatives',
      'vs',
      'review',
      'guide',
      'tutorial',
      'best',
      'top',
      'tips',
      'strategies',
      'examples',
      'case study',
      'beginner',
      'advanced',
      'pros and cons',
      'comparison',
      'features',
      'setup',
      'installation',
      'troubleshooting',
      'faq',
    ];

    for (const result of competitorData) {
      const snippet = result.snippet?.toLowerCase() ?? '';
      const title = result.title?.toLowerCase() ?? '';

      for (const phrase of commonPhrases) {
        if (snippet.includes(phrase) || title.includes(phrase)) {
          coveredTopics.add(phrase);
        }
      }
    }

    const allStandardTopics = new Set(commonPhrases);
    const gaps: string[] = [];

    for (const topic of allStandardTopics) {
      if (!coveredTopics.has(topic)) {
        gaps.push(topic);
      }
    }

    return gaps.length >= 2 ? gaps : ['comprehensive comparison', 'step-by-step walkthrough'];
  }

  /**
   * Determine a narrative angle from news data and trend context.
   * Returns a specific, actionable angle rather than a generic summary.
   */
  determineNarrativeAngle(newsData: NewsResult[], trendData: Trend): string {
    if (newsData.length === 0) {
      return `Understanding the rise of ${trendData.query} and its implications`;
    }

    const sentiments = newsData.map((n) => ({
      title: n.title?.toLowerCase() ?? '',
      snippet: n.snippet?.toLowerCase() ?? '',
      source: n.source ?? 'unknown',
    }));

    const impactPhrases = sentiments.filter(
      (s) =>
        s.snippet.includes('impact') ||
        s.snippet.includes('change') ||
        s.snippet.includes('shift') ||
        s.snippet.includes('growth') ||
        s.snippet.includes('decline'),
    );

    if (impactPhrases.length > 0) {
      const topStory = impactPhrases[0];
      return `How ${trendData.query} is reshaping the landscape: insights from ${topStory.source}`;
    }

    const recentTitle = sentiments[0]?.title ?? '';
    if (recentTitle.length > 10) {
      const truncated =
        recentTitle.length > 60 ? recentTitle.substring(0, 57) + '...' : recentTitle;
      return `${truncated} — a deep dive into the latest developments`;
    }

    return `What you need to know about ${trendData.query} right now`;
  }

  /**
   * Validate that the guide meets quality requirements before returning it.
   */
  validateGuide(guide: GuideData): boolean {
    if (guide.dataPoints.length < MIN_DATAPOINTS) {
      throw new AppError(
        'E004',
        `Content guide requires at least ${MIN_DATAPOINTS} data points, but only ${guide.dataPoints.length} were found for keyword "${guide.targetKeyword}"`,
      );
    }

    if (!guide.narrativeAngle || guide.narrativeAngle.trim().length === 0) {
      throw new AppError(
        'E004',
        `Content guide requires a non-empty narrative angle for keyword "${guide.targetKeyword}"`,
      );
    }

    if (guide.sectionBlueprint.length < 2) {
      throw new AppError(
        'E004',
        `Content guide requires at least 2 sections in the blueprint, but only ${guide.sectionBlueprint.length} were generated for keyword "${guide.targetKeyword}"`,
      );
    }

    return true;
  }

  /**
   * Infer search intent from SERP result composition.
   */
  private inferSearchIntent(results: SearchResult[]): string {
    const titles = results.map((r) => (r.title ?? '').toLowerCase());
    const snippets = results.map((r) => (r.snippet ?? '').toLowerCase());

    const informational = titles.filter(
      (t) =>
        t.includes('what') ||
        t.includes('how') ||
        t.includes('why') ||
        t.includes('guide') ||
        t.includes('tutorial'),
    ).length;

    const commercial = titles.filter(
      (t) => t.includes('best') || t.includes('top') || t.includes('review') || t.includes('vs'),
    ).length;

    const transactional = titles.filter(
      (t) =>
        t.includes('buy') ||
        t.includes('price') ||
        t.includes('cost') ||
        t.includes('discount') ||
        t.includes('coupon'),
    ).length;

    const navigational = titles.filter(
      (t) => t.includes('login') || t.includes('sign in') || t.includes('download'),
    ).length;

    if (transactional > informational && transactional > commercial) return 'transactional';
    if (commercial > informational) return 'commercial';
    if (navigational > 0) return 'navigational';
    return 'informational';
  }

  /**
   * Determine the article type based on trend velocity and SERP composition.
   */
  private determineArticleType(trendData: Trend, results: SearchResult[]): string {
    if (trendData.searchVolume && trendData.searchVolume > 10000) {
      return 'breaking-news';
    }

    const hasListicles = results.some(
      (r) =>
        (r.title ?? '').includes('best') ||
        (r.title ?? '').includes('top') ||
        (r.title ?? '').includes('ways'),
    );

    if (hasListicles) return 'listicle';

    const hasHowTo = results.some(
      (r) => (r.title ?? '').includes('how to') || (r.title ?? '').includes('guide'),
    );

    if (hasHowTo) return 'how-to-guide';

    return 'informational-article';
  }

  /**
   * Calculate average word count from SERP snippets.
   */
  private calculateAverageWordCount(results: SearchResult[]): number {
    if (results.length === 0) return 1500;

    const totalWords = results.reduce((sum, r) => {
      const words = (r.snippet ?? '').split(/\s+/).filter(Boolean).length;
      return sum + words;
    }, 0);

    return Math.round(totalWords / results.length) * 50;
  }

  /**
   * Detect featured snippet format from top SERP result.
   */
  private detectFeaturedSnippetFormat(results: SearchResult[]): string | null {
    if (results.length === 0) return null;

    const topSnippet = (results[0]?.snippet ?? '').toLowerCase();

    if (results[0]?.title?.toLowerCase().includes('list') || /\d+\.\s/.test(topSnippet)) {
      return 'list';
    }

    if (
      topSnippet.includes('step') ||
      topSnippet.includes('first') ||
      topSnippet.includes('then')
    ) {
      return 'paragraph';
    }

    if (results[0]?.snippet && results[0]?.snippet.length < 100) {
      return 'paragraph';
    }

    return null;
  }

  /**
   * Extract specific, verifiable data points from news and search results.
   * Each data point must be grounded in a result rather than generic.
   */
  private extractDataPoints(newsData: NewsResult[], searchData: SearchResult[]): string[] {
    const dataPoints: string[] = [];

    for (const news of newsData.slice(0, 5)) {
      if (news.snippet && news.snippet.length > 20) {
        dataPoints.push(news.snippet);
      }
    }

    if (dataPoints.length < MIN_DATAPOINTS) {
      for (const result of searchData.slice(0, 5)) {
        if (result.snippet && result.snippet.length > 20) {
          dataPoints.push(result.snippet);
        }
      }
    }

    return dataPoints.slice(0, 5);
  }

  /**
   * Build a section blueprint from competitor subheadings, content gaps, and article type.
   */
  private buildSectionBlueprint(
    subheadings: string[],
    contentGaps: string[],
    articleType: string,
  ): string[] {
    const blueprint: string[] = ['introduction'];

    if (subheadings.length > 0) {
      blueprint.push(...subheadings.slice(0, 6));
    }

    if (contentGaps.length > 0) {
      blueprint.push(...contentGaps.slice(0, 2));
    }

    if (articleType === 'how-to-guide') {
      blueprint.push('common-mistakes-to-avoid');
      blueprint.push('faq');
    }

    if (articleType === 'listicle') {
      blueprint.push('honorable-mentions');
      blueprint.push('buying-guide');
    }

    if (articleType === 'breaking-news') {
      blueprint.push('what-this-means');
      blueprint.push('industry-reaction');
    }

    blueprint.push('conclusion');

    return blueprint;
  }

  /**
   * Build the list of forbidden content patterns.
   */
  private buildForbiddenPatterns(): string[] {
    return [
      'generic overview of',
      'comprehensive guide to everything',
      'in this article we will',
      'in conclusion',
      'learn more about',
      'click here to',
      'this is just the beginning',
      'the future of',
      'game-changer',
      'revolutionary',
    ];
  }

  /**
   * Determine target word count based on SERP average and article type.
   */
  private determineTargetWordCount(avgWordCount: number, articleType: string): number {
    const baseTarget = Math.max(avgWordCount, 1200);

    switch (articleType) {
      case 'breaking-news':
        return Math.min(baseTarget, 1500);
      case 'listicle':
        return Math.max(baseTarget, 2000);
      case 'how-to-guide':
        return Math.max(baseTarget, 1800);
      default:
        return baseTarget;
    }
  }

  /**
   * Extract heading candidates from a title and snippet pair.
   * Splits on punctuation and common structural cues.
   */
  private extractHeadingCandidates(title: string, snippet: string): string[] {
    const candidates: string[] = [];

    const titleClean = title.replace(/[|–—\-] .*$/, '').trim();
    if (titleClean.length > 10 && titleClean.length < 80) {
      candidates.push(titleClean);
    }

    const bulletPatterns = snippet.match(/(?:^|\n)\s*[•\-*]\s*([^\n]{10,80})/g);
    if (bulletPatterns) {
      for (const match of bulletPatterns) {
        const cleaned = match.replace(/^\s*[•\-*]\s*/, '').trim();
        if (cleaned.length > 10) {
          candidates.push(cleaned);
        }
      }
    }

    const numberedPatterns = snippet.match(/\d+\.\s+([^\n]{10,80})/g);
    if (numberedPatterns) {
      for (const match of numberedPatterns) {
        const cleaned = match.replace(/^\d+\.\s+/, '').trim();
        if (cleaned.length > 10) {
          candidates.push(cleaned);
        }
      }
    }

    return candidates;
  }

  /**
   * Identify internal link opportunities from the keyword's associated categories.
   */
  private findInternalLinkOpportunities(keyword: PrismaKeyword): string[] {
    const opportunities: string[] = [];

    if (keyword.keyword) {
      opportunities.push(`existing articles related to "${keyword.keyword}"`);
    }

    if (keyword.modifier) {
      opportunities.push(`articles covering "${keyword.modifier}" aspect`);
    }

    opportunities.push('related category overview page');

    return opportunities;
  }

  /**
   * Identify external link opportunities from top SERP results.
   */
  private findExternalLinkOpportunities(results: SearchResult[]): string[] {
    const opportunities: string[] = [];

    for (const result of results.slice(0, 5)) {
      if (result.url) {
        const domain = this.extractDomain(result.url);
        const title = result.title ?? 'related resource';
        opportunities.push(`${title} (${domain})`);
      }
    }

    return opportunities;
  }

  /**
   * Extract the domain from a URL.
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }
}

export default ContentGuide;
