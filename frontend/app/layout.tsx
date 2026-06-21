import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CookieConsent from '@/components/ui/CookieConsent';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    template: '%s | GameDayWire',
    default: 'GameDayWire — Your Daily Sports & Entertainment News Feed',
  },
  description:
    'Your daily source for original sports and entertainment analysis, trends, and breaking news — powered by AI-driven content generation.',
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'GameDayWire',
    description: 'Your daily source for original sports and entertainment analysis.',
    siteName: 'GameDayWire',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameDayWire',
    description: 'Your daily source for original sports and entertainment analysis.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-1 pt-16">
            {children}
          </main>
          <Footer />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
