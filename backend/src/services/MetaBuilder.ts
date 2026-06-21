import { config } from '@/config/index.js';

// ---------------------------------------------------------------------------
// MetaBuilder
// ---------------------------------------------------------------------------

class MetaBuilder {
  /**
   * Generate an SEO-optimized title tag (50-60 chars) with the keyword
   * positioned near the start. If the full title is over 60 characters,
   * truncate at the last space within the limit. If the keyword does not
   * appear within the first 60 characters, prefix with keyword + " | ".
   */
  generateTitleTag(keyword: string, title: string): string {
    const lowerTitle = title.toLowerCase();
    const lowerKeyword = keyword.toLowerCase().trim();

    let titleTag = title;

    // Check if keyword appears within the first 60 characters
    const keywordIdx = lowerTitle.indexOf(lowerKeyword);
    if (keywordIdx < 0 || keywordIdx >= 60) {
      // Keyword is missing or too far — prefix it
      titleTag = `${keyword} | ${title}`;
    }

    // Truncate at last space within 60 characters
    if (titleTag.length > 60) {
      const truncated = titleTag.substring(0, 60);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        titleTag = truncated.substring(0, lastSpace);
      } else {
        titleTag = truncated;
      }
    }

    return titleTag.trim();
  }

  /**
   * Generate a meta description (150-160 chars by default) by extracting
   * the first paragraph-like section of content that contains the keyword.
   * If no section contains the keyword, prepend a keyword sentence.
   * Ensures the description ends with a period and is truncated cleanly
   * at the last space within maxLength.
   */
  generateMetaDescription(keyword: string, content: string, maxLength: number = 160): string {
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase().trim();

    // ---- Split content into paragraph-like sections ----
    const paragraphs = content
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    let description: string;

    // Find the first paragraph containing the keyword
    const keywordParagraph = paragraphs.find((p) => p.toLowerCase().includes(lowerKeyword));

    if (keywordParagraph) {
      description = keywordParagraph;
    } else {
      // No paragraph contains the keyword — try single newline blocks
      const lines = content
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const keywordLine = lines.find((l) => l.toLowerCase().includes(lowerKeyword));

      description = keywordLine ?? paragraphs[0] ?? content;
    }

    // If keyword is still missing from the description, prepend a sentence
    if (!description.toLowerCase().includes(lowerKeyword)) {
      const prefix = `Learn about ${keyword}. `;
      if (prefix.length >= maxLength) {
        return prefix.substring(0, maxLength);
      }
      const remaining = maxLength - prefix.length;
      let suffix = description.substring(0, remaining);
      if (suffix.length === remaining) {
        const lastSpace = suffix.lastIndexOf(' ');
        if (lastSpace > 0) {
          suffix = suffix.substring(0, lastSpace);
        }
      }
      description = prefix + suffix;
    }

    // Ensure the description ends with a period
    description = description.replace(/[^.\w\s]$/, '') || description;
    if (!description.endsWith('.')) {
      description += '.';
    }

    // Truncate at last space within maxLength
    if (description.length > maxLength) {
      const truncated = description.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        description = truncated.substring(0, lastSpace);
      } else {
        description = truncated;
      }

      // Re-ensure period after truncation
      if (!description.endsWith('.')) {
        description += '.';
      }
    }

    return description.trim();
  }

  /**
   * Generate Open Graph meta tags for an article.
   * Returns an object with standard og: properties.
   */
  generateOgTags(article: {
    title: string;
    description?: string | null;
    slug: string;
    featuredImage?: string | null;
  }): Record<string, string> {
    const baseUrl = config.siteUrl.replace(/\/+$/, '');

    return {
      'og:title': article.title,
      'og:description': article.description ?? article.title,
      'og:url': `${baseUrl}/article/${article.slug}`,
      'og:type': 'article',
      'og:image': article.featuredImage ?? `${baseUrl}/images/og-default.jpg`,
      'og:site_name': 'GameDayWire',
    };
  }

  /**
   * Generate Twitter Card meta tags for an article.
   * Returns an object with standard twitter: properties.
   */
  generateTwitterCard(article: {
    title: string;
    description?: string | null;
    slug: string;
    featuredImage?: string | null;
  }): Record<string, string> {
    const baseUrl = config.siteUrl.replace(/\/+$/, '');

    return {
      'twitter:card': 'summary_large_image',
      'twitter:title': article.title,
      'twitter:description': article.description ?? article.title,
      'twitter:image': article.featuredImage ?? `${baseUrl}/images/og-default.jpg`,
      'twitter:site': '@gamedaywire',
    };
  }

  /**
   * Generate the canonical URL for an article.
   * Strips trailing slash from siteUrl before appending the slug path.
   */
  generateCanonical(slug: string): string {
    const baseUrl = config.siteUrl.replace(/\/+$/, '');
    return `${baseUrl}/article/${slug}`;
  }
}

export default MetaBuilder;
