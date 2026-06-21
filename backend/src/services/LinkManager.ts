import { PrismaClient, Article } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'done',
  'due',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'here',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'just',
  'like',
  'more',
  'most',
  'much',
  'my',
  'no',
  'nor',
  'not',
  'now',
  'of',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'own',
  'per',
  'quite',
  'rather',
  'really',
  'said',
  'same',
  'should',
  'since',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'upon',
  'very',
  'was',
  'way',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'why',
  'will',
  'with',
  'would',
  'you',
]);

const TIER_1_SOURCES: string[] = [
  'espn.com',
  'bbc.com/sport',
  'skysports.com',
  'theathletic.com',
  'nba.com',
  'variety.com',
  'hollywoodreporter.com',
  'billboard.com',
];

const TIER_2_SOURCES: string[] = [
  'foxsports.com',
  'cbssports.com',
  'si.com',
  'bleacherreport.com',
  'rollingstone.com',
  'tmz.com',
  'eonline.com',
  'yahoo.com/sports',
];

const MAX_LINK_OPPORTUNITIES = 5;
const SIMILARITY_THRESHOLD = 0.1;
const ANCHOR_TEXT_MAX_LENGTH = 100;
const LINK_VALIDATION_TIMEOUT_MS = 3000;
const BROKEN_LINK_CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// LinkManager
// ---------------------------------------------------------------------------

class LinkManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Compute TF-IDF cosine similarity between the given article's title/content
   * and all other articles. Returns the top 5 candidates whose similarity
   * score exceeds 0.1, sorted by score descending.
   *
   * Text is assembled from the article's title, h1, and contentHtml fields.
   */
  async findLinkingOpportunities(
    article: Article,
    allArticles: Article[],
  ): Promise<Array<{ slug: string; title: string; score: number }>> {
    const candidates = allArticles.filter((a) => a.id !== article.id);

    if (candidates.length === 0) {
      return [];
    }

    // Tokenize source article
    const sourceText = this.assembleArticleText(article);
    const sourceTokens = this.tokenize(sourceText);

    // Tokenize all candidates
    const allTokenSets: string[][] = candidates.map((c) =>
      this.tokenize(this.assembleArticleText(c)),
    );

    // Insert source tokens into the IDF corpus so rare source tokens are
    // properly weighted
    const corpusTokenSets = [sourceTokens, ...allTokenSets];
    const idf = this.computeIdf(corpusTokenSets);

    // Compute TF for source
    const sourceTf = this.computeTf(sourceTokens);

    // Score each candidate
    const scored: Array<{ slug: string; title: string; score: number }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const candidateTf = this.computeTf(allTokenSets[i]);
      const score = this.cosineSimilarity(sourceTf, candidateTf, idf);

      if (score > SIMILARITY_THRESHOLD) {
        scored.push({
          slug: candidate.slug,
          title: candidate.title,
          score,
        });
      }
    }

    // Sort by score descending, return top 5
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_LINK_OPPORTUNITIES);
  }

  /**
   * Return the list of tier-1 source domains for external citation linking.
   * These are high-authority sports and entertainment publications.
   */
  getTier1Sources(): string[] {
    return [...TIER_1_SOURCES];
  }

  /**
   * Return the list of tier-2 source domains for external citation linking.
   * These are secondary but still reputable sports and entertainment outlets.
   */
  getTier2Sources(): string[] {
    return [...TIER_2_SOURCES];
  }

  /**
   * Perform a HEAD request to the given URL to verify the link is reachable.
   * Returns true if the response status is in the 200-299 range.
   * Returns false on network errors or timeouts (3 second timeout).
   */
  async validateLink(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(LINK_VALIDATION_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear all existing LinkGraph entries, then for every article compute
   * linking opportunities via TF-IDF similarity and persist LinkGraph records.
   *
   * Each record uses:
   *   sourceSlug   — the linking article's slug
   *   targetSlug   — the linked article's slug
   *   linkType     — 'internal'
   *   anchorText   — opportunity title truncated to 100 characters
   *   articleId    — the source article's database id
   *
   * Returns the total number of links created.
   */
  async rebuildLinkGraph(articles: Article[]): Promise<number> {
    // Clear existing link graph
    await this.prisma.linkGraph.deleteMany({});

    if (articles.length < 2) {
      return 0;
    }

    let totalLinks = 0;

    for (const article of articles) {
      const opportunities = await this.findLinkingOpportunities(article, articles);

      if (opportunities.length === 0) {
        continue;
      }

      // Batch-create LinkGraph records for this article's opportunities
      const records = opportunities.map((opp) => ({
        sourceSlug: article.slug,
        targetSlug: opp.slug,
        anchorText: opp.title.substring(0, ANCHOR_TEXT_MAX_LENGTH),
        linkType: 'internal' as const,
        articleId: article.id,
      }));

      await this.prisma.linkGraph.createMany({
        data: records,
      });

      totalLinks += records.length;
    }

    return totalLinks;
  }

  /**
   * Validate a list of URLs concurrently (max 5 at a time) and return the
   * subset that are unreachable (non-2xx response, network error, or timeout).
   */
  async checkBrokenLinks(links: string[]): Promise<string[]> {
    const broken: string[] = [];
    const queue = [...links];

    // Process links in batches of BROKEN_LINK_CONCURRENCY
    for (let i = 0; i < queue.length; i += BROKEN_LINK_CONCURRENCY) {
      const batch = queue.slice(i, i + BROKEN_LINK_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (url) => {
          const valid = await this.validateLink(url);
          return { url, valid };
        }),
      );

      for (const result of results) {
        if (!result.valid) {
          broken.push(result.url);
        }
      }
    }

    return broken;
  }

  // -----------------------------------------------------------------------
  // Private helpers — TF-IDF
  // -----------------------------------------------------------------------

  /**
   * Assemble the textual content of an article from its title, h1, and
   * contentHtml fields.
   */
  private assembleArticleText(article: Article): string {
    const parts: string[] = [article.title];

    if (article.h1) {
      parts.push(article.h1);
    }

    if (article.contentHtml) {
      // Strip HTML tags to get plain text for tokenization
      const plainText = article.contentHtml.replace(/<[^>]*>/g, ' ');
      parts.push(plainText);
    }

    return parts.join(' ');
  }

  /**
   * Tokenize a string: lowercase, split on non-alpha characters, remove
   * common English stop words and tokens shorter than 3 characters.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  }

  /**
   * Compute term frequency for a list of tokens.
   * Returns a Map where keys are tokens and values are the fraction of
   * all tokens they represent (count / totalTokens).
   */
  private computeTf(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();

    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }

    const totalTokens = tokens.length;

    if (totalTokens === 0) {
      return new Map();
    }

    const tf = new Map<string, number>();
    for (const [token, count] of freq) {
      tf.set(token, count / totalTokens);
    }

    return tf;
  }

  /**
   * Compute inverse document frequency across a collection of token sets.
   * Returns a Map where each unique token maps to
   *   log(totalDocuments / (1 + documentFrequency))
   *
   * The +1 in the denominator provides smoothing to avoid division by zero.
   */
  private computeIdf(allTokenSets: string[][]): Map<string, number> {
    const totalDocuments = allTokenSets.length;

    // Count document frequency: in how many documents each token appears
    const docFreq = new Map<string, number>();

    for (const tokens of allTokenSets) {
      const seen = new Set(tokens);
      for (const token of seen) {
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
    }

    // Compute IDF
    const idf = new Map<string, number>();
    for (const [token, df] of docFreq) {
      idf.set(token, Math.log(totalDocuments / (1 + df)));
    }

    return idf;
  }

  /**
   * Compute the cosine similarity between two TF-IDF-weighted term frequency
   * vectors. IDF weights are applied to each vector component before computing
   * the dot product and magnitudes.
   *
   *   tfidf(token) = tf(token) * idf(token)
   *
   * Returns a value in [0, 1] where 1 indicates identical term distributions
   * after IDF weighting.
   */
  private cosineSimilarity(
    vec1: Map<string, number>,
    vec2: Map<string, number>,
    idf: Map<string, number>,
  ): number {
    // Collect all unique tokens from both vectors
    const allTokens = new Set([...vec1.keys(), ...vec2.keys()]);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const token of allTokens) {
      const weight = idf.get(token) ?? 0;
      const tf1 = vec1.get(token) ?? 0;
      const tf2 = vec2.get(token) ?? 0;

      const tfidf1 = tf1 * weight;
      const tfidf2 = tf2 * weight;

      dotProduct += tfidf1 * tfidf2;
      norm1 += tfidf1 * tfidf1;
      norm2 += tfidf2 * tfidf2;
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }
}

export default LinkManager;
