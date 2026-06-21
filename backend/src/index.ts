import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from '@/config/index.js';
import { errorHandler } from '@/middleware/errorHandler.js';

// Route imports
import healthRoutes from '@/routes/health.js';
import trendsRoutes from '@/routes/trends.js';
import keywordsRoutes from '@/routes/keywords.js';
import articlesRoutes from '@/routes/articles.js';
import sitemapRoutes from '@/routes/sitemap.js';
import rssRoutes from '@/routes/rss.js';
import generateRoutes from '@/routes/generate.js';
import webhookRoutes from '@/routes/webhook.js';
import trackRoutes from '@/routes/track.js';

// Admin route imports
import adminAuthRoutes from '@/routes/admin/auth.js';
import adminStatsRoutes from '@/routes/admin/stats.js';
import adminArticlesRoutes from '@/routes/admin/articles.js';
import adminCategoriesRoutes from '@/routes/admin/categories.js';
import adminAnalyticsRoutes from '@/routes/admin/analytics.js';
import adminLinksRoutes from '@/routes/admin/links.js';
import { start as startCron } from '../../cron/scheduler.js';

const app: express.Express = express();

app.set('trust proxy', 1);

// Middleware stack (order matters)
app.use(cors());
app.use(helmet());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'E012', message: 'Too many requests, please try again later.' } }
});
app.use(globalLimiter);
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Public API routes
app.use('/api/health', healthRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/sitemap', sitemapRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/track', trackRoutes);

// Admin API routes (auth uses its own login without adminAuth)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/articles', adminArticlesRoutes);
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin', adminLinksRoutes);

// Error handler (must be last)
app.use(errorHandler);

export { app };

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('/index.ts') || process.argv[1].endsWith('/index.js'));

if (isDirectRun) {
  startCron();
  app.listen(config.port, () => {
    console.log(`[GameDayWire] Backend running on port ${config.port}`);
  });
}
