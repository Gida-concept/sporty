// ---------------------------------------------------------------------------
// ImageHandler — Generates featured image URLs, alt text, and placeholders
// ---------------------------------------------------------------------------

const CATEGORY_IMAGES: Record<string, string> = {
  sports: 'https://picsum.photos/seed/sports/1200/630',
  nba: 'https://picsum.photos/seed/basketball/1200/630',
  basketball: 'https://picsum.photos/seed/basketball/1200/630',
  nfl: 'https://picsum.photos/seed/football/1200/630',
  football: 'https://picsum.photos/seed/football/1200/630',
  mlb: 'https://picsum.photos/seed/baseball/1200/630',
  baseball: 'https://picsum.photos/seed/baseball/1200/630',
  soccer: 'https://picsum.photos/seed/soccer/1200/630',
  'premier-league': 'https://picsum.photos/seed/soccer/1200/630',
  entertainment: 'https://picsum.photos/seed/entertainment/1200/630',
  movies: 'https://picsum.photos/seed/entertainment/1200/630',
  music: 'https://picsum.photos/seed/music/1200/630',
  tv: 'https://picsum.photos/seed/tv/1200/630',
  television: 'https://picsum.photos/seed/tv/1200/630',
  gaming: 'https://picsum.photos/seed/gaming/1200/630',
};

const DEFAULT_IMAGE = 'https://picsum.photos/seed/default/1200/630';

class ImageHandler {
  /**
   * Generate a featured image URL for an article using picsum.photos
   * with the article slug as the deterministic seed.
   * Returns a 1200x630 URL suitable for Open Graph.
   */
  generateFeaturedImage(
    article: { slug: string; title: string; category?: string },
    style?: string,
  ): string {
    const seed = encodeURIComponent(article.slug);
    let url = `https://picsum.photos/seed/${seed}/1200/630`;

    if (style) {
      url += `?${style}`;
    }

    return url;
  }

  /**
   * Return a themed image URL for the given category.
   * Falls back to a default image if no category mapping exists.
   */
  getImageForCategory(category: string): string {
    const key = category.toLowerCase().trim();
    return CATEGORY_IMAGES[key] ?? DEFAULT_IMAGE;
  }

  /**
   * Generate descriptive alt text from the article title.
   * If a keyword is provided and differs from the title, it is incorporated.
   * Result is capped at 125 characters and ends with a period.
   */
  generateAltText(title: string, keyword?: string): string {
    const trimmedTitle = title.trim();

    if (!keyword || keyword.trim().toLowerCase() === trimmedTitle.toLowerCase()) {
      const alt = `Image illustrating ${trimmedTitle}`;
      if (alt.length <= 125) {
        return alt.endsWith('.') ? alt : `${alt}.`;
      }
      return `${trimmedTitle.substring(0, 120).replace(/\s+\S*$/, '')}.`;
    }

    const trimmedKeyword = keyword.trim();
    const alt = `${trimmedTitle} - ${trimmedKeyword}`;

    if (alt.length <= 125) {
      return `${alt}.`;
    }

    // Too long — use just the title truncated
    const truncated = `${trimmedTitle} - ${trimmedKeyword}`;
    const short = truncated.substring(0, 120).replace(/\s+\S*$/, '');
    return `${short}.`;
  }

  /**
   * Return a small placeholder image URL (100x100) for the given category.
   * Uses the same seed as getImageForCategory but at a smaller resolution.
   */
  getPlaceholderImage(category: string): string {
    const key = category.toLowerCase().trim();
    const seed = CATEGORY_IMAGES[key]
      ? (Object.entries(CATEGORY_IMAGES)
          .find(([k]) => k === key)?.[1]
          ?.match(/seed\/([^/]+)/)?.[1] ?? 'default')
      : 'default';

    return `https://picsum.photos/seed/${seed}/100/100`;
  }
}

export default ImageHandler;
