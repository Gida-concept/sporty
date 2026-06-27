import { CATEGORIES, DEFAULT_PAGE_SIZE, RELATED_ARTICLES_COUNT } from './constants';

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';
const FETCH_TIMEOUT_MS = 15000;

/* ------------------------------------------------------------------ */
/*  Fetch helper with timeout (prevents hanging during static gen)     */
/* ------------------------------------------------------------------ */

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Coexist with any existing signal (e.g. from a parent AbortController)
  const existingSignal = options.signal;
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ------------------------------------------------------------------ */
/*  Frontend types (interface with components)                         */
/* ------------------------------------------------------------------ */

export interface Article {
  id: string;
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  excerpt: string;
  contentHtml: string;
  contentBlocks: ContentBlock[];
  imageUrl: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  featured: boolean;
  pageviews: number;
}

export interface ContentBlock {
  type: 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'image' | 'code-block' | 'table';
  content: string;
  level?: number;
  items?: string[];
  caption?: string;
  language?: string;
  headers?: string[];
  rows?: string[][];
  url?: string;
  alt?: string;
}

export interface Trend {
  query: string;
  normalizedQuery: string;
  searchVolume: number;
  growthRate: number;
  trendScore: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  articleCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; pageSize: number; totalPages: number; totalItems: number };
}

export interface ArticleDetailResponse {
  article: Article;
  relatedArticles: Article[];
  faqs: FAQItem[];
  headings: HeadingItem[];
}

/* ------------------------------------------------------------------ */
/*  Backend API types (snake_case from Express)                        */
/* ------------------------------------------------------------------ */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  cached?: boolean;
  timestamp: string;
}

export interface BackendArticle {
  id: number;
  slug: string;
  title: string;
  meta_description: string | null;
  h1: string | null;
  content_html: string | null;
  content_blocks: unknown[] | null;
  categories: { id: number; name: string; slug: string }[];
  word_count: number | null;
  reading_level: number | null;
  quality_score: number | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  pageviews: number;
  google_position: number | null;
  image_url: string | null;
  excerpt: string | null;
  author: string;
  featured: boolean;
  tags: string[] | null;
}

/* ------------------------------------------------------------------ */
/*  Transform helpers (backend snake_case → frontend camelCase)        */
/* ------------------------------------------------------------------ */

const CATEGORY_IMAGES: Record<string, string> = {
  sports: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9391?w=800&q=80',
  entertainment: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80';

function computeReadTime(wordCount: number | null): string {
  if (!wordCount) return '5';
  return String(Math.max(1, Math.ceil(wordCount / 200)));
}

function getCategorySlug(categories: { slug: string }[]): string {
  return categories[0]?.slug || 'general';
}

function getCategoryName(categories: { name: string }[]): string {
  return categories[0]?.name || 'General';
}

function getFallbackImage(categories: { slug: string }[]): string {
  const slug = getCategorySlug(categories);
  return CATEGORY_IMAGES[slug] || DEFAULT_IMAGE;
}

function getExcerpt(article: { excerpt: string | null; content_blocks: unknown[] | null }): string {
  if (article.excerpt) return article.excerpt;
  if (article.content_blocks && Array.isArray(article.content_blocks)) {
    const blocks = article.content_blocks as Array<Record<string, unknown>>;
    const firstP = blocks.find((b) => b.type === 'p');
    if (firstP?.content && typeof firstP.content === 'string') {
      return firstP.content.slice(0, 200);
    }
  }
  return 'Read the latest analysis and insights on GameDayWire.';
}

function toAppArticle(ba: BackendArticle): Article {
  return {
    id: String(ba.id),
    slug: ba.slug,
    title: ba.title,
    metaDescription: ba.meta_description || '',
    h1: ba.h1 || '',
    excerpt: getExcerpt(ba),
    contentHtml: ba.content_html || '',
    contentBlocks: ((ba.content_blocks || []) as Array<Partial<ContentBlock>>).map(
      (b) => ({ content: '', ...b }) as ContentBlock,
    ),
    imageUrl: ba.image_url || getFallbackImage(ba.categories),
    category: getCategoryName(ba.categories),
    tags: ba.tags || [],
    author: ba.author,
    publishedAt: ba.published_at || '',
    updatedAt: ba.updated_at,
    readTime: computeReadTime(ba.word_count),
    featured: ba.featured,
    pageviews: ba.pageviews || 0,
  };
}

function extractHeadings(blocks: ContentBlock[]): HeadingItem[] {
  return blocks
    .filter(
      (b): b is ContentBlock & { content: string } =>
        (b.type === 'h2' || b.type === 'h3') && !!b.content,
    )
    .map((b) => ({
      id: b
        .content!.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      text: b.content!,
      level: b.type === 'h2' ? 2 : 3,
    }));
}

function extractFAQs(blocks: ContentBlock[]): FAQItem[] {
  // Look for FAQ-like blocks in content_blocks
  const faqBlocks = blocks.filter(
    (b) => b.type === 'h2' && b.content?.toLowerCase().includes('faq'),
  );
  if (faqBlocks.length === 0) return [];

  // Try to extract Q&A pairs after the FAQ heading
  const faqs: FAQItem[] = [];
  for (let i = 0; i < blocks.length - 1; i++) {
    if (
      (blocks[i].type === 'h2' || blocks[i].type === 'h3') &&
      blocks[i].content?.toLowerCase().includes('faq')
    ) {
      // Look for paragraphs after this heading that look like Q&A
      for (let j = i + 1; j < blocks.length && j < i + 10; j++) {
        if (blocks[j].type === 'h2' || blocks[j].type === 'h3') break;
        if (blocks[j].type === 'p' && blocks[j].content) {
          const c = blocks[j].content!;
          if (c.includes('?') && c.length < 150) {
            // This looks like a question
            const answer = blocks[j + 1]?.content || '';
            if (answer) {
              faqs.push({ question: c, answer });
              j++; // skip the answer paragraph
            }
          }
        }
      }
    }
  }
  return faqs;
}

/* ------------------------------------------------------------------ */
/*  Mock data (kept as importable backup—deprecated)                   */
/* ------------------------------------------------------------------ */

function generateMockBlocks(count: number): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  const h3Headings = [
    'What This Means for Fans',
    'Behind the Numbers',
    'Expert Analysis',
    'The Bigger Picture',
    'What Comes Next',
    'Key Takeaways',
  ];

  const introParagraphs = [
    'The landscape is shifting faster than most anticipated. What started as a ripple has turned into a full-scale wave that industry insiders say will redefine the playbook for years to come.',
    'Multiple sources confirm that the momentum behind this trend is accelerating. Insider reports suggest the numbers could double by next quarter alone.',
    '"This is unlike anything we\'ve seen in recent memory," one industry veteran told GameDayWire. "The speed of adoption is outpacing every projection we had."',
  ];

  const analysisParagraphs = [
    'Breaking down the data reveals a clear pattern. Viewership numbers have surged 47% year-over-year, with the 18-34 demographic leading the charge. That\'s not just growth — that\'s a seismic shift.',
    'What makes this development particularly noteworthy is the timing. Coming off a record-breaking season, the momentum shows no signs of slowing. Early indicators point to even stronger numbers ahead.',
    'Industry analysts point to three key drivers: changing consumer habits, technological advancement, and a generational shift in how audiences engage with content.',
  ];

  const quoteParagraphs = [
    '"This changes the equation entirely," says Marcus Chen, a senior analyst who has been tracking the trend since its inception. "We\'re looking at a paradigm shift that will have ripple effects across the entire industry."',
    '"The numbers don\'t lie," explains Sarah Mitchell, director of market intelligence at a leading research firm. "When you see this kind of sustained growth across multiple metrics, it\'s not a blip — it\'s a transformation."',
  ];

  const listItems = [
    ['Record-breaking engagement numbers across key demographics', 'Surging interest from international markets', 'New revenue streams opening for content creators', 'Enhanced fan experiences driving loyalty'],
    ['Strategic partnerships reshaping the competitive landscape', 'Technology investments paying dividends early', 'Expanding audience reach beyond core demographics', 'Innovative content formats gaining traction'],
    ['Growing influence of social media on consumption patterns', 'Traditional media adapting to new realities', 'Emerging markets showing outsized growth potential', 'Data-driven decision making becoming standard'],
  ];

  for (let i = 1; i <= count; i++) {
    blocks.push({
      type: 'h2' as const,
      content: `Section ${i}: ${i === 1 ? 'The Big Story Unfolds' : i === 2 ? 'Inside the Numbers' : i === 3 ? 'Expert Perspectives' : i === 4 ? 'Industry Impact' : i === 5 ? 'Looking Ahead' : 'Final Analysis'}`,
    });

    blocks.push({
      type: 'p' as const,
      content: introParagraphs[(i - 1) % introParagraphs.length],
    });

    blocks.push({
      type: 'p' as const,
      content: analysisParagraphs[(i - 1) % analysisParagraphs.length],
    });

    if (i % 2 === 0) {
      blocks.push({
        type: 'blockquote' as const,
        content: quoteParagraphs[(i / 2 - 1) % quoteParagraphs.length],
      });
    }

    const h3Content = h3Headings[(i - 1) % h3Headings.length];
    blocks.push({ type: 'h3' as const, content: h3Content });

    blocks.push({
      type: 'p' as const,
      content: `The implications are far-reaching. Key stakeholders are already adjusting their strategies to align with these new market realities. Early movers are seeing measurable returns, while laggards risk being left behind.`,
    });

    blocks.push({
      type: 'ul' as const,
      content: '',
      items: listItems[(i - 1) % listItems.length],
    });
  }

  return blocks;
}

function generateMockFAQs(): FAQItem[] {
  return [
    {
      question: 'What is this article about?',
      answer:
        'This article provides comprehensive analysis and insights into the latest developments in this topic.',
    },
    {
      question: 'Why is this topic important?',
      answer:
        'Understanding this topic is crucial for staying informed about major shifts affecting the industry and broader landscape.',
    },
    {
      question: 'Where can I find more information?',
      answer: 'Stay tuned to GameDayWire for ongoing coverage and analysis.',
    },
  ];
}

function mockImageUrl(category: string): string {
  return CATEGORY_IMAGES[category.toLowerCase()] || DEFAULT_IMAGE;
}

const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    slug: 'nba-finals-2026-preview',
    title: 'NBA Finals 2026: Complete Preview and Championship Predictions',
    metaDescription: 'Expert analysis for the 2026 NBA Finals.',
    h1: 'NBA Finals 2026: Complete Preview',
    excerpt: 'Get ready for the most anticipated NBA Finals in recent memory.',
    imageUrl: mockImageUrl('sports'),
    category: 'sports',
    tags: ['NBA', 'basketball', 'finals'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-15T08:00:00Z',
    readTime: '8',
    featured: true,
    pageviews: 15420,
    contentHtml: '',
    contentBlocks: generateMockBlocks(4),
  },
  {
    id: '2',
    slug: 'premier-league-transfer-rumors',
    title: 'Premier League Transfer Window: Latest Rumors and Confirmed Deals',
    metaDescription: 'Roundup of Premier League transfer stories.',
    h1: 'Premier League Transfer Window',
    excerpt: 'The summer transfer window is heating up.',
    imageUrl: mockImageUrl('sports'),
    category: 'sports',
    tags: ['Premier League', 'soccer', 'transfers'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-14T10:30:00Z',
    updatedAt: '2026-06-14T10:30:00Z',
    readTime: '6',
    featured: false,
    pageviews: 8730,
    contentHtml: '',
    contentBlocks: generateMockBlocks(3),
  },
  {
    id: '3',
    slug: 'marvel-phase-7-announcements',
    title: 'Marvel Phase 7: Every Movie and Show Announced at Comic-Con',
    metaDescription: 'Full breakdown of Marvel Phase 7.',
    h1: 'Marvel Phase 7 Announcements',
    excerpt: 'Marvel Studios dropped a bombshell at Comic-Con.',
    imageUrl: mockImageUrl('entertainment'),
    category: 'entertainment',
    tags: ['Marvel', 'movies', 'Comic-Con'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-13T14:00:00Z',
    updatedAt: '2026-06-13T14:00:00Z',
    readTime: '10',
    featured: true,
    pageviews: 12150,
    contentHtml: '',
    contentBlocks: generateMockBlocks(5),
  },
  {
    id: '4',
    slug: 'oscars-2026-nominations',
    title: 'Oscars 2026: Full List of Nominations and Predictions',
    metaDescription: 'Complete Oscars 2026 nominations.',
    h1: 'Oscars 2026 Nominations',
    excerpt: 'The Academy has spoken.',
    imageUrl: mockImageUrl('entertainment'),
    category: 'entertainment',
    tags: ['Oscars', 'movies', 'awards'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-12T09:00:00Z',
    updatedAt: '2026-06-12T09:00:00Z',
    readTime: '7',
    featured: false,
    pageviews: 7240,
    contentHtml: '',
    contentBlocks: generateMockBlocks(3),
  },
  {
    id: '5',
    slug: 'super-bowl-lvii-recap',
    title: 'Super Bowl LVII: Game Recap, MVP, and Best Commercials',
    metaDescription: 'Complete Super Bowl LVII coverage.',
    h1: 'Super Bowl LVII Recap',
    excerpt: 'Relive the biggest game of the year.',
    imageUrl: mockImageUrl('sports'),
    category: 'sports',
    tags: ['NFL', 'Super Bowl', 'football'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-11T20:00:00Z',
    updatedAt: '2026-06-11T20:00:00Z',
    readTime: '9',
    featured: false,
    pageviews: 18600,
    contentHtml: '',
    contentBlocks: generateMockBlocks(4),
  },
  {
    id: '6',
    slug: 'netflix-binge-worthy-shows',
    title: "Netflix Top 10: Binge-Worthy Shows You Can't Miss This Month",
    metaDescription: 'Best new shows on Netflix.',
    h1: 'Netflix Binge-Worthy Shows',
    excerpt: 'Struggling to find something good to watch?',
    imageUrl: mockImageUrl('entertainment'),
    category: 'entertainment',
    tags: ['Netflix', 'streaming', 'TV shows'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-10T11:00:00Z',
    updatedAt: '2026-06-10T11:00:00Z',
    readTime: '5',
    featured: false,
    pageviews: 9870,
    contentHtml: '',
    contentBlocks: generateMockBlocks(2),
  },
  {
    id: '7',
    slug: 'nfl-draft-2026-analysis',
    title: 'NFL Draft 2026: Team-by-Team Grades and Analysis',
    metaDescription: 'Complete 2026 NFL Draft analysis.',
    h1: 'NFL Draft 2026 Analysis',
    excerpt: 'The 2026 NFL Draft is in the books.',
    imageUrl: mockImageUrl('sports'),
    category: 'sports',
    tags: ['NFL', 'draft', 'football'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-09T16:00:00Z',
    updatedAt: '2026-06-09T16:00:00Z',
    readTime: '12',
    featured: false,
    pageviews: 11340,
    contentHtml: '',
    contentBlocks: generateMockBlocks(5),
  },
  {
    id: '8',
    slug: 'taylor-swift-tour-announcement',
    title: 'Taylor Swift Announces Global Tour: Dates, Tickets, and Everything We Know',
    metaDescription: 'Taylor Swift tour details.',
    h1: 'Taylor Swift Global Tour',
    excerpt: 'Taylor Swift is hitting the road again!',
    imageUrl: mockImageUrl('entertainment'),
    category: 'entertainment',
    tags: ['Taylor Swift', 'music', 'tour'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-08T13:00:00Z',
    updatedAt: '2026-06-08T13:00:00Z',
    readTime: '6',
    featured: false,
    pageviews: 14560,
    contentHtml: '',
    contentBlocks: generateMockBlocks(3),
  },
  {
    id: '9',
    slug: 'nba-free-agency-2026',
    title: 'NBA Free Agency 2026: Biggest Moves and Contract Signings',
    metaDescription: 'NBA Free Agency tracker.',
    h1: 'NBA Free Agency 2026',
    excerpt: 'The NBA free agency period is in full swing.',
    imageUrl: mockImageUrl('sports'),
    category: 'sports',
    tags: ['NBA', 'free agency', 'basketball'],
    author: 'GameDayWire Staff',
    publishedAt: '2026-06-07T10:00:00Z',
    updatedAt: '2026-06-07T10:00:00Z',
    readTime: '7',
    featured: false,
    pageviews: 6210,
    contentHtml: '',
    contentBlocks: generateMockBlocks(3),
  },
];

const MOCK_TRENDS: Trend[] = [
  {
    query: 'NBA Finals 2026',
    normalizedQuery: 'nba finals 2026',
    searchVolume: 850000,
    growthRate: 95,
    trendScore: 95,
  },
  {
    query: 'Premier League Transfers',
    normalizedQuery: 'premier league transfers',
    searchVolume: 620000,
    growthRate: 88,
    trendScore: 88,
  },
  {
    query: 'Marvel Phase 7',
    normalizedQuery: 'marvel phase 7',
    searchVolume: 740000,
    growthRate: 82,
    trendScore: 82,
  },
  {
    query: 'Oscars 2026',
    normalizedQuery: 'oscars 2026',
    searchVolume: 510000,
    growthRate: 79,
    trendScore: 79,
  },
  {
    query: 'Super Bowl LVII',
    normalizedQuery: 'super bowl lvii',
    searchVolume: 920000,
    growthRate: 76,
    trendScore: 76,
  },
];

/* ------------------------------------------------------------------ */
/*  Trending + pageview tracking helpers                               */
/* ------------------------------------------------------------------ */

export async function getTrendingArticles(limit = 5): Promise<Article[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_ARTICLES]
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, limit);
  }
  const res = await fetchWithTimeout(`/api/articles?sort=pageviews&limit=${limit}`, {
    next: { revalidate: 300 },
  });
  const json = await res.json();
  if (!json.success) return [];
  return (json.data?.articles || []).map((ba: BackendArticle) => toAppArticle(ba));
}

const pageviewStore = new Map<string, number>();

export async function trackPageview(articleId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    pageviewStore.set(articleId, (pageviewStore.get(articleId) || 0) + 1);
    return;
  }
  await fetchWithTimeout(`/api/track?article_id=${encodeURIComponent(articleId)}`).catch(() => {});
}

export function getMockPageviews(articleId: string): number {
  return pageviewStore.get(articleId) || 0;
}

/* ------------------------------------------------------------------ */
/*  Public API functions                                              */
/* ------------------------------------------------------------------ */

export async function getArticles(params?: {
  category?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedResponse<Article>> {
  if (USE_MOCK_DATA) {
    let filtered = [...MOCK_ARTICLES];
    if (params?.category) filtered = filtered.filter((a) => a.category === params.category);
    if (params?.search)
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(params.search!.toLowerCase()),
      );
    const page = params?.page || 1;
    const pageSize = params?.pageSize || DEFAULT_PAGE_SIZE;
    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      pagination: { page, pageSize, totalPages, totalItems: filtered.length },
    };
  }
  const p = new URLSearchParams();
  if (params?.category) p.set('category', params.category);
  if (params?.page)
    p.set('offset', String((params.page - 1) * (params.pageSize || DEFAULT_PAGE_SIZE)));
  if (params?.pageSize) p.set('limit', String(params.pageSize));
  if (params?.search) p.set('search', params.search);
  const res = await fetchWithTimeout(`/api/articles?${p}`, {
    next: { revalidate: 300 },
  });
  const json = await res.json();
  if (!json.success) {
    return { data: [], pagination: { page: 1, pageSize: 20, totalPages: 0, totalItems: 0 } };
  }
  const { articles: backendArticles, total } = json.data;
  const page = params?.page || 1;
  const pageSize = params?.pageSize || DEFAULT_PAGE_SIZE;
  const totalPages = Math.ceil((total || 0) / pageSize);
  return {
    data: (backendArticles || []).map((ba: BackendArticle) => toAppArticle(ba)),
    pagination: { page, pageSize, totalPages, totalItems: total || 0 },
  };
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetailResponse | null> {
  if (USE_MOCK_DATA) {
    const article = MOCK_ARTICLES.find((a) => a.slug === slug) || null;
    if (!article) return null;
    const related = MOCK_ARTICLES.filter(
      (a) => a.category === article.category && a.slug !== slug,
    ).slice(0, RELATED_ARTICLES_COUNT);
    const headings = extractHeadings(article.contentBlocks);
    return { article, relatedArticles: related, faqs: generateMockFAQs(), headings };
  }
  const res = await fetchWithTimeout(
    `/api/articles?slug=${encodeURIComponent(slug)}&include_body=true`,
    {
      next: { revalidate: 60 },
    },
  );
  const json = await res.json();
  if (!json.success || !json.data?.article) return null;
  const ba = json.data.article as BackendArticle;
  const article = toAppArticle(ba);
  const headings = extractHeadings(article.contentBlocks);
  const faqs = extractFAQs(article.contentBlocks);
  return { article, relatedArticles: [], faqs, headings };
}

export async function getFeaturedArticles(limit = 3): Promise<Article[]> {
  if (USE_MOCK_DATA) return MOCK_ARTICLES.filter((a) => a.featured).slice(0, limit);
  const res = await fetchWithTimeout(`/api/articles?featured=true&limit=${limit}`, {
    next: { revalidate: 300 },
  });
  const json = await res.json();
  if (!json.success) return [];
  return (json.data?.articles || []).map((ba: BackendArticle) => toAppArticle(ba));
}

export async function getTrends(params?: { category?: string; limit?: number }): Promise<Trend[]> {
  if (USE_MOCK_DATA) return params?.limit ? MOCK_TRENDS.slice(0, params.limit) : MOCK_TRENDS;
  const p = new URLSearchParams();
  if (params?.category) p.set('category', params.category);
  if (params?.limit) p.set('limit', String(params.limit));
  const res = await fetchWithTimeout(`/api/trends?${p}`, {
    next: { revalidate: 600 },
  });
  const json = await res.json();
  if (!json.success || !json.data?.trends) return [];
  return json.data.trends.map(
    (t: {
      query: string;
      normalizedQuery: string;
      searchVolume: number;
      growthRate: number;
      trendScore: number;
    }) => ({
      query: t.query,
      normalizedQuery: t.normalizedQuery,
      searchVolume: t.searchVolume,
      growthRate: t.growthRate,
      trendScore: t.trendScore,
    }),
  );
}

export async function getCategories(): Promise<Category[]> {
  if (USE_MOCK_DATA)
    return CATEGORIES.map((c) => ({
      ...c,
      articleCount: MOCK_ARTICLES.filter((a) => a.category === c.slug).length,
    }));
  // No public categories endpoint — derive from articles
  const result = await getArticles({ pageSize: 1 }).catch(() => null);
  if (!result) return CATEGORIES.map((c) => ({ ...c, articleCount: 0 }));
  return CATEGORIES.map((c) => ({
    ...c,
    articleCount: result.pagination.totalItems > 0 ? result.pagination.totalItems : 0,
  }));
}

export async function getArticlesByTag(
  tag: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedResponse<Article>> {
  if (USE_MOCK_DATA) {
    const filtered = MOCK_ARTICLES.filter((a) =>
      a.tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
    );
    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      pagination: { page, pageSize, totalPages, totalItems: filtered.length },
    };
  }
  const res = await fetchWithTimeout(
    `/api/articles?tag=${encodeURIComponent(tag)}&offset=${(page - 1) * pageSize}&limit=${pageSize}`,
    {
      next: { revalidate: 300 },
    },
  );
  const json = await res.json();
  if (!json.success) {
    return { data: [], pagination: { page, pageSize, totalPages: 0, totalItems: 0 } };
  }
  const { articles: backendArticles, total } = json.data;
  const totalPages = Math.ceil((total || 0) / pageSize);
  return {
    data: (backendArticles || []).map((ba: BackendArticle) => toAppArticle(ba)),
    pagination: { page, pageSize, totalPages, totalItems: total || 0 },
  };
}
