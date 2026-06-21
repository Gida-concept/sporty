'use client';

import { useEffect } from 'react';
import { trackPageview } from '@/lib/api-client';

interface TrackPageviewProps {
  articleId: string;
  slug: string;
}

export default function TrackPageview({ articleId, slug }: TrackPageviewProps) {
  useEffect(() => {
    trackPageview(articleId);
  }, [articleId]);

  return null;
}
