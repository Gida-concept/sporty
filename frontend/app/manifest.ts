import type { MetadataRoute } from 'next';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return {
    name: 'GameDayWire',
    short_name: 'GameDayWire',
    description:
      'Your daily source for original sports and entertainment analysis, trends, and breaking news.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e40af',
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
    ],
  };
}
