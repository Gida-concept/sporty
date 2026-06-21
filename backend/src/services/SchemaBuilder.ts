interface ArticleSchemaInput {
  title: string;
  slug: string;
  metaDescription?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  contentHtml?: string | null;
  schemaMarkup?: string | null;
  categories?: Array<{ category: { name: string; slug: string } }>;
}

class SchemaBuilder {
  /**
   * Based on content analysis, detect the best schema.org type.
   * Keywords in the content determine the type.
   */
  detectSchemaType(content: string): string {
    const lower = content.toLowerCase();

    if (
      lower.includes('breaking') ||
      lower.includes('update') ||
      lower.includes('reports') ||
      lower.includes('just in')
    ) {
      return 'NewsArticle';
    }

    if (
      lower.includes('profile') ||
      lower.includes('background') ||
      lower.includes('career') ||
      lower.includes('born')
    ) {
      return 'ProfilePage';
    }

    if (
      lower.includes('game') ||
      lower.includes('match') ||
      lower.includes('vs') ||
      lower.includes('score') ||
      lower.includes('final')
    ) {
      return 'SportsEvent';
    }

    if (lower.includes('review') || lower.includes('rating') || lower.includes('verdict')) {
      return 'Review';
    }

    if (
      lower.includes('how to') ||
      lower.includes('guide') ||
      lower.includes('steps') ||
      lower.includes('tips')
    ) {
      return 'HowTo';
    }

    if (
      lower.includes('top') ||
      lower.includes('best') ||
      lower.includes('ranking') ||
      lower.includes('list')
    ) {
      return 'Article';
    }

    return 'Article';
  }

  /**
   * Build a complete schema.org object for an article.
   * Default @type is 'Article' or the detected type.
   */
  buildArticleSchema(article: ArticleSchemaInput & { schemaType?: string }): object {
    const content = article.title + ' ' + (article.contentHtml || '');
    const detectedType = article.schemaType || this.detectSchemaType(content);

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': detectedType,
      headline: article.title,
      description: article.metaDescription || article.title,
      datePublished: article.publishedAt
        ? article.publishedAt.toISOString()
        : article.createdAt?.toISOString(),
      dateModified: article.updatedAt?.toISOString(),
      author: {
        '@type': 'Organization',
        name: 'GameDayWire',
      },
      publisher: {
        '@type': 'Organization',
        name: 'GameDayWire',
        logo: {
          '@type': 'ImageObject',
          url: 'https://yoursite.com/images/logo.svg',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://yoursite.com/article/${article.slug}/`,
      },
      image: `https://yoursite.com/images/featured/${article.slug}.jpg`,
    };

    // Add ItemList as additionalType for list-style content
    const lower = content.toLowerCase();
    if (
      lower.includes('top') ||
      lower.includes('best') ||
      lower.includes('ranking') ||
      lower.includes('list')
    ) {
      schema.additionalType = 'ItemList';
    }

    // Include category breadcrumbs if available
    if (article.categories && article.categories.length > 0) {
      const categoryNames = article.categories.map((c) => c.category.name);
      schema.about = categoryNames;
      schema.genre = categoryNames[0];
    }

    return schema;
  }

  /**
   * Build a standard FAQPage schema from a list of question/answer pairs.
   */
  buildFAQSchema(faqList: Array<{ question: string; answer: string }>): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqList.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }

  /**
   * Build a BreadcrumbList schema from an array of breadcrumb entries.
   */
  buildBreadcrumbSchema(crumbs: Array<{ name: string; url: string }>): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };
  }

  /**
   * Validate a schema object by checking that required properties
   * for common schema types are present.
   */
  validateSchema(schema: Record<string, unknown>): boolean {
    if (!schema['@context'] || !schema['@type']) {
      return false;
    }

    const type = schema['@type'] as string;

    if (
      type === 'Article' ||
      type === 'NewsArticle' ||
      type === 'SportsEvent' ||
      type === 'ProfilePage' ||
      type === 'Review' ||
      type === 'HowTo'
    ) {
      if (!schema.headline || !schema.datePublished || !schema.author) {
        return false;
      }
    }

    if (type === 'FAQPage') {
      if (
        !schema.mainEntity ||
        !Array.isArray(schema.mainEntity) ||
        schema.mainEntity.length === 0
      ) {
        return false;
      }
    }

    if (type === 'BreadcrumbList') {
      if (
        !schema.itemListElement ||
        !Array.isArray(schema.itemListElement) ||
        schema.itemListElement.length === 0
      ) {
        return false;
      }
    }

    return true;
  }
}

export default SchemaBuilder;
