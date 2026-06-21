// No project imports needed — this is a pure utility class

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BANNED_PHRASES: string[] = [
  'in the world of sports',
  'in the world of entertainment',
  "in today's game",
  'when it comes to',
  "it's no secret that",
  "let's dive into",
  "let's take a closer look",
  "if you're a fan of",
  'the landscape of',
  'the tapestry of',
  'the realm of',
  'the beauty of',
  'delve into',
  'navigate the',
  'unpack the',
  'explore the',
  'multifaceted',
  'game-changer',
  'ever-evolving',
  'one-stop',
  'truly',
  'essentially',
  'importantly',
  'interestingly',
  'notably',
  'ultimately',
  'in conclusion',
  'to sum up',
  'all in all',
  'at the end of the day',
  'in the final analysis',
];

const QUESTION_STARTERS: string[] = [
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

const POSITIVE_WORDS: string[] = [
  'amazing',
  'excellent',
  'great',
  'fantastic',
  'incredible',
  'outstanding',
  'brilliant',
  'wonderful',
  'superb',
  'exceptional',
  'thrilling',
  'exciting',
  'victory',
  'triumph',
  'champion',
  'record-breaking',
  'dominant',
  'impressive',
  'remarkable',
  'sensational',
];

const NEGATIVE_WORDS: string[] = [
  'terrible',
  'awful',
  'horrible',
  'disappointing',
  'devastating',
  'heartbreaking',
  'disastrous',
  'appalling',
  'dreadful',
  'abysmal',
  'defeat',
  'failure',
  'loss',
  'injured',
  'struggling',
  'controversial',
  'ugly',
  'messy',
  'chaotic',
  'shocking',
];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

// ---------------------------------------------------------------------------
// TextAnalyzer
// ---------------------------------------------------------------------------

class TextAnalyzer {
  /**
   * Calculate Flesch-Kincaid Reading Ease score.
   * Formula: 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
   * Returns score clamped to 0-100, rounded to 1 decimal place.
   * Returns 100 for edge cases (empty text, single word, etc.).
   */
  fleschKincaid(text: string): number {
    const totalWords = this.countWords(text);

    if (totalWords <= 1) {
      return 100;
    }

    const sentences = this.extractSentences(text);
    const totalSentences = sentences.length;

    if (totalSentences === 0) {
      return 100;
    }

    const words = text.split(/\s+/).filter((w) => w.length > 0);
    let totalSyllables = 0;

    for (const word of words) {
      totalSyllables += this.countSyllables(word);
    }

    const score =
      206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);

    const clamped = Math.max(0, Math.min(100, score));

    return Math.round(clamped * 10) / 10;
  }

  /**
   * Calculate reading level — delegates to fleschKincaid for the score,
   * then maps it to a grade-level label.
   */
  calculateReadingLevel(text: string): number {
    return this.fleschKincaid(text);
  }

  /**
   * Return array of banned phrases found in text (case-insensitive).
   * Includes heuristic checks for:
   * - Opening with questions
   * - Wikipedia references
   * - Generic praise patterns
   */
  checkBannedPhrases(text: string): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    // Exact banned phrase matching
    for (const phrase of BANNED_PHRASES) {
      if (lowerText.includes(phrase)) {
        found.push(phrase);
      }
    }

    // Heuristic: opening with questions
    // Check if the text starts with a question word followed by content and a question mark
    const firstWord = lowerText.split(/\s+/)[0]?.replace(/[^a-z]/g, '') ?? '';
    if (QUESTION_STARTERS.includes(firstWord) && lowerText.includes('?')) {
      found.push('opening with questions');
    }

    // Heuristic: Wikipedia references
    if (
      lowerText.includes('according to wikipedia') ||
      lowerText.includes('wikipedia states') ||
      lowerText.includes('wikipedia says') ||
      lowerText.includes('wikipedia reports') ||
      lowerText.includes('as per wikipedia')
    ) {
      found.push('summarizing Wikipedia references');
    }

    // Heuristic: generic praise patterns
    const genericPraisePatterns: RegExp[] = [
      /is one of the (best|greatest|most|top)/i,
      /is widely (regarded|considered|recognized|acknowledged)/i,
      /is known for (its|being|his|her|their)/i,
      /has been (praised|acclaimed|celebrated|lauded)/i,
      /is celebrated for/i,
    ];

    for (const pattern of genericPraisePatterns) {
      if (pattern.test(text)) {
        found.push('generic praise patterns');
        break; // Only report once
      }
    }

    return found;
  }

  /**
   * Compute cosine similarity between two texts.
   * Tokenizes into words (lowercase, split on non-alpha, filter words < 3 chars).
   * Returns value 0-1, rounded to 4 decimal places.
   */
  computeSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    const vec1 = this.buildFrequencyVector(tokens1);
    const vec2 = this.buildFrequencyVector(tokens2);

    // Compute dot product
    let dotProduct = 0;
    for (const [word, count1] of vec1) {
      const count2 = vec2.get(word) ?? 0;
      dotProduct += count1 * count2;
    }

    // Compute norms
    let norm1 = 0;
    for (const count of vec1.values()) {
      norm1 += count * count;
    }
    norm1 = Math.sqrt(norm1);

    let norm2 = 0;
    for (const count of vec2.values()) {
      norm2 += count * count;
    }
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    const similarity = dotProduct / (norm1 * norm2);

    return Math.round(similarity * 10000) / 10000;
  }

  /**
   * Simple keyword-based sentiment analysis.
   * Counts positive and negative word occurrences, computes a score
   * normalized to -1 to 1, then classifies as positive, negative, or neutral.
   */
  analyzeSentiment(text: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  } {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter((w) => w.length > 0);
    const totalWords = words.length;

    if (totalWords === 0) {
      return { sentiment: 'neutral', score: 0 };
    }

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      const cleaned = word.replace(/[^a-z-]/g, '');
      if (POSITIVE_WORDS.includes(cleaned)) {
        positiveCount++;
      }
      if (NEGATIVE_WORDS.includes(cleaned)) {
        negativeCount++;
      }
    }

    const rawScore = (positiveCount - negativeCount) / totalWords;
    // Clamp to -1 .. 1
    const score = Math.max(-1, Math.min(1, rawScore));

    let sentiment: 'positive' | 'negative' | 'neutral';
    if (score > 0.1) {
      sentiment = 'positive';
    } else if (score < -0.1) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return { sentiment, score };
  }

  /**
   * Calculate what percentage of total words the keyword represents.
   * Counts occurrences of keyword (case-insensitive), divides by total words,
   * returns percentage rounded to 2 decimal places.
   */
  keywordDensity(text: string, keyword: string): number {
    if (!keyword || keyword.length === 0) {
      return 0;
    }

    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    // Count occurrences
    let occurrences = 0;
    let idx = 0;
    while ((idx = lowerText.indexOf(lowerKeyword, idx)) !== -1) {
      occurrences++;
      idx += lowerKeyword.length;
    }

    if (occurrences === 0) {
      return 0;
    }

    const totalWords = this.countWords(text);

    if (totalWords === 0) {
      return 0;
    }

    const density = (occurrences / totalWords) * 100;
    return Math.round(density * 100) / 100;
  }

  /**
   * Count total words in text.
   * Splits on whitespace and filters empty strings.
   */
  countWords(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }

    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Split text into sentences on . ! ? followed by space or end of string.
   * Trims each sentence and filters empty strings.
   */
  extractSentences(text: string): string[] {
    if (!text || text.length === 0) {
      return [];
    }

    const sentences = text.split(/[.!?](?:\s|$)/);

    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Count syllables in a word by counting vowel groups (a, e, i, o, u, y).
   * Minimum of 1 syllable per word.
   */
  private countSyllables(word: string): number {
    if (!word || word.length === 0) {
      return 0;
    }

    const lower = word.toLowerCase();
    let count = 0;
    let prevWasVowel = false;

    for (const char of lower) {
      const isVowel = VOWELS.has(char);
      if (isVowel && !prevWasVowel) {
        count++;
      }
      prevWasVowel = isVowel;
    }

    return Math.max(1, count);
  }

  /**
   * Tokenize text into words: lowercase, split on non-alpha characters,
   * filter out words shorter than 3 characters.
   */
  private tokenize(text: string): string[] {
    if (!text || text.length === 0) {
      return [];
    }

    return text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 3);
  }

  /**
   * Build a word frequency vector from a token array.
   * Returns a Map of word -> count.
   */
  private buildFrequencyVector(tokens: string[]): Map<string, number> {
    const vector = new Map<string, number>();

    for (const token of tokens) {
      vector.set(token, (vector.get(token) ?? 0) + 1);
    }

    return vector;
  }
}

export default TextAnalyzer;
