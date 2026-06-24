'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import CookieConsent from '@/components/ui/CookieConsent';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [bodyHtml, setBodyHtml] = useState('');
  const [headerBannerHtml, setHeaderBannerHtml] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data || {};
        setBodyHtml(data.body_html || '');
        setHeaderBannerHtml(data.ad_header_banner || '');
      })
      .catch(() => {});
  }, []);

  // Admin pages get their own layout (sidebar via admin/layout.tsx) — no public chrome
  if (isAdmin) {
    return <>{children}</>;
  }

  // Public pages get header, footer, cookie consent, and main content wrapper
  return (
    <div className="flex min-h-screen flex-col">
      {bodyHtml && (
        <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      )}
      {headerBannerHtml && (
        <div className="w-full bg-gray-50 border-b border-gray-200">
          <div className="mx-auto flex justify-center px-4 py-2">
            <div dangerouslySetInnerHTML={{ __html: headerBannerHtml }} />
          </div>
        </div>
      )}
      <Header />
      <main id="main-content" className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
