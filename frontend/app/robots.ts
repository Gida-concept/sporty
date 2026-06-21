import type { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
