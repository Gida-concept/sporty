'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ConsentData {
  consented: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'gdpr-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Small delay so the transition plays on mount
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    const data: ConsentData = { consented: true, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setVisible(false);
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur transition-transform duration-500 ease-in-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="flex-1 text-sm text-gray-600">
          We use cookies to improve your experience. By continuing, you agree to our{' '}
          <Link href="/page/privacy-policy" className="underline hover:text-brand-600">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Link
            href="/page/privacy-policy"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Learn More
          </Link>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
