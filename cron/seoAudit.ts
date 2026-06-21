import prisma from '../backend/src/lib/prisma.js';
import TextAnalyzer from '../backend/src/services/TextAnalyzer.js';
import type { CronResult, CronOptions } from './types.js';

interface AuditIssue {
  type: string;
  severity: 'warning' | 'error';
  articleId: string;
  slug: string;
  detail: string;
}

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    const textAnalyzer = new TextAnalyzer();
    const articles = await prisma.article.findMany({
      where: { status: 'published' },
      select: { id: true, slug: true, title: true, metaDescription: true, contentHtml: true },
    });

    const issues: AuditIssue[] = [];

    for (const article of articles) {
      // Check meta description length
      if (
        article.metaDescription &&
        (article.metaDescription.length < 120 || article.metaDescription.length > 160)
      ) {
        issues.push({
          type: 'meta_description_length',
          severity: 'warning',
          articleId: String(article.id),
          slug: article.slug,
          detail: `Meta description is ${article.metaDescription.length} chars (target: 120-160)`,
        });
      }

      // Check for banned phrases
      if (article.contentHtml && article.title) {
        const banned = textAnalyzer.checkBannedPhrases(
          article.contentHtml + ' ' + (article.title || ''),
        );
        if (banned && banned.length > 0) {
          issues.push({
            type: 'banned_phrases',
            severity: 'error',
            articleId: String(article.id),
            slug: article.slug,
            detail: `Found ${banned.length} banned phrases`,
          });
        }
      }
    }

    const hasIssues = issues.length > 0;

    return {
      success: true,
      exitCode: hasIssues ? 1 : 0,
      message: `SEO audit complete: ${issues.length} issues found across ${articles.length} articles${dryRun ? ' (dry-run)' : ''}`,
      details: {
        articleCount: articles.length,
        issueCount: issues.length,
        issues: issues.slice(0, 20),
        dryRun,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `SEO audit failed: ${message}`,
      details: { error: message },
    };
  }
}
