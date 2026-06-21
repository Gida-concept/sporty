import type { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL || 'https://www.gamedaywire.com';

const staticPages = [
  { path: '/page/about', priority: 0.8 },
  { path: '/page/contact', priority: 0.8 },
  { path: '/page/privacy-policy', priority: 0.8 },
  { path: '/page/terms', priority: 0.8 },
  { path: '/page/disclaimer', priority: 0.8 },
] as const;

const categories = [
  { path: '/category/sports', priority: 0.5 },
  { path: '/category/entertainment', priority: 0.5 },
] as const;

const articleSlugs = [
  'nba-finals-2026-preview',
  'premier-league-transfer-rumors',
  'marvel-phase-7-announcements',
  'oscars-2026-nominations',
  'super-bowl-lvii-recap',
  'netflix-binge-worthy-shows',
  'nfl-draft-2026-analysis',
  'taylor-swift-tour-announcement',
  'nba-free-agency-2026',
] as const;

const mockLastModified = new Date('2026-06-19');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Root URL
  entries.push({
    url: SITE_URL,
    lastModified: mockLastModified,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Static pages
  for (const page of staticPages) {
    entries.push({
      url: `${SITE_URL}${page.path}`,
      lastModified: mockLastModified,
      changeFrequency: 'weekly',
      priority: page.priority,
    });
  }

  // Category pages
  for (const category of categories) {
    entries.push({
      url: `${SITE_URL}${category.path}`,
      lastModified: mockLastModified,
      changeFrequency: 'weekly',
      priority: category.priority,
    });
  }

  // Article pages
  for (const slug of articleSlugs) {
    entries.push({
      url: `${SITE_URL}/article/${slug}`,
      lastModified: mockLastModified,
      changeFrequency: 'daily',
      priority: 0.6,
    });
  }

  return entries;
}
