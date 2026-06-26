import prisma from '../backend/src/lib/prisma.js';
import { config } from '../backend/src/config/index.js';
import SerpAPI from '../backend/src/lib/SerpAPI.js';
import GroqAPI from '../backend/src/lib/GroqAPI.js';
import TrendFinder from '../backend/src/services/TrendFinder.js';
import KeywordMatrix from '../backend/src/services/KeywordMatrix.js';
import ContentGuide from '../backend/src/services/ContentGuide.js';
import GroqWriter from '../backend/src/services/GroqWriter.js';
import SEOOptimizer from '../backend/src/services/SEOOptimizer.js';
import SchemaBuilder from '../backend/src/services/SchemaBuilder.js';
import TextAnalyzer from '../backend/src/services/TextAnalyzer.js';
import ArticleBuilder from '../backend/src/services/ArticleBuilder.js';
import LinkManager from '../backend/src/services/LinkManager.js';
import ImageHandler from '../backend/src/services/ImageHandler.js';
import Publisher from '../backend/src/services/Publisher.js';
import type { CronResult, CronOptions } from './types.js';

export async function execute(options: CronOptions = {}): Promise<CronResult> {
  const { dryRun = false } = options;

  try {
    // Opposite category from morning
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const category = dayOfYear % 2 === 0 ? 'entertainment' : 'sports';

    // Wire up dependencies
    const serpAPI = new SerpAPI();
    const groqAPI = new GroqAPI();
    const trendFinder = new TrendFinder(serpAPI, prisma);
    const keywordMatrix = new KeywordMatrix(serpAPI, prisma);
    const contentGuide = new ContentGuide(serpAPI, prisma);
    const groqWriter = new GroqWriter(groqAPI);
    const seoOptimizer = new SEOOptimizer();
    const schemaBuilder = new SchemaBuilder();
    const textAnalyzer = new TextAnalyzer();
    const articleBuilder = new ArticleBuilder(seoOptimizer, schemaBuilder, textAnalyzer);
    const linkManager = new LinkManager(prisma);
    const imageHandler = new ImageHandler();
    const publisher = new Publisher(prisma, imageHandler);

    // Pipeline
    const trends = await trendFinder.discover(category, ['us', 'gb']);
    if (!trends || trends.length === 0) {
      return { success: false, exitCode: 2, message: `No trends found for category: ${category}` };
    }

    const topTrend = trends[0];
    const keyword = await keywordMatrix.getWinningKeyword(topTrend);
    if (!keyword) {
      return { success: false, exitCode: 2, message: 'No winning keyword found from top trend' };
    }

    const guide = await contentGuide.generate(keyword, topTrend);
    if (!guide || !guide.dataPoints || guide.dataPoints.length < 2) {
      return { success: false, exitCode: 2, message: 'Content guide has insufficient data points' };
    }

    const generated = await groqWriter.generateArticle(guide);
    if (!generated) {
      return { success: false, exitCode: 1, message: 'Article generation returned empty result' };
    }

    const article = await articleBuilder.assemble(keyword, topTrend, guide, generated);

    if (!dryRun) {
      const published = await publisher.publish(article);
      return {
        success: true,
        exitCode: 0,
        message: `Published article: ${published.title || article.slug} (${category})`,
        details: { slug: article.slug, category, title: published.title },
      };
    }

    return {
      success: true,
      exitCode: 0,
      message: `Dry-run: article ready to publish (${category})`,
      details: { slug: article.slug, category, dryRun: true },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      exitCode: 1,
      message: `Evening article generation failed: ${message}`,
      details: { error: message },
    };
  }
}
