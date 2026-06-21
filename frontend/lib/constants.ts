export const SITE_NAME = 'GameDayWire';
export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const CATEGORIES = [
  {
    slug: 'sports',
    name: 'Sports',
    description: 'Latest sports news, analysis, and trending topics.',
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    description: 'Entertainment news, celebrity gossip, and pop culture.',
  },
] as const;

export const DEFAULT_PAGE_SIZE = 12;
export const RECENT_ARTICLES_COUNT = 6;
export const RELATED_ARTICLES_COUNT = 3;
export const TRENDING_TOPICS_COUNT = 5;
export const RECENT_ARTICLES_DAYS = 7;

export const CACHE_TTL = {
  ARTICLES: 300,
  ARTICLE_DETAIL: 600,
  TRENDS: 1800,
  CATEGORIES: 3600,
  STATIC: 86400,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  MAX_PAGE_SIZE: 50,
  VISIBLE_PAGES: 5,
} as const;
