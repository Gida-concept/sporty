import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config, validateConfig, adminTokenIsFromEnv } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import SiteSettingsService from './services/SiteSettingsService.js';

// Route imports
import healthRoutes from './routes/health.js';
import trendsRoutes from './routes/trends.js';
import keywordsRoutes from './routes/keywords.js';
import articlesRoutes from './routes/articles.js';
import sitemapRoutes from './routes/sitemap.js';
import rssRoutes from './routes/rss.js';
import generateRoutes from './routes/generate.js';
import webhookRoutes from './routes/webhook.js';
import trackRoutes from './routes/track.js';
import settingsRoutes from './routes/settings.js';

// Admin route imports
import adminAuthRoutes from './routes/admin/auth.js';
import adminStatsRoutes from './routes/admin/stats.js';
import adminArticlesRoutes from './routes/admin/articles.js';
import adminCategoriesRoutes from './routes/admin/categories.js';
import adminAnalyticsRoutes from './routes/admin/analytics.js';
import adminLinksRoutes from './routes/admin/links.js';
import adminSettingsRoutes from './routes/admin/settings.js';
// Cron scheduler import is done via dynamic import at startup to avoid
// TypeScript resolving the cross-package dependency at compile time.
// This keeps the backend build self-contained and prevents the Docker
// build from needing cron's dependencies installed in its compilation context.

const app: express.Express = express();

app.set('trust proxy', 1);

// CORS is configured with a dynamic origin that resolves from SiteSettingsService.
// The actual origin value is loaded during async startup below.
let corsOrigin = 'http://localhost:3000';
app.use(cors({
  origin: () => corsOrigin,
}));
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

// Global request timeout (30 seconds)
app.use((req, res, next) => {
  res.setTimeout(30_000, () => {
    res.status(503).json({
      success: false,
      error: { code: 'E013', message: 'Request timed out' },
    });
  });
  next();
});

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
app.use('/api/settings', settingsRoutes);

// Admin API routes (auth uses its own login without adminAuth)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/articles', adminArticlesRoutes);
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin', adminLinksRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);

// Error handler (must be last)
app.use(errorHandler);

export { app };

const scriptPath = (process.argv[1] ?? '').replace(/\\/g, '/');
const isDirectRun =
  scriptPath &&
  (scriptPath.endsWith('/index.ts') || scriptPath.endsWith('/index.js'));

if (isDirectRun) {
  // Async startup: load DB-backed settings before listening
  (async () => {
    try {
      const settingsService = SiteSettingsService.getInstance();
      corsOrigin = await settingsService.getCorsOrigin();
    } catch (err) {
      console.warn('[Startup] Could not load CORS origin from DB, using default:', (err as Error).message);
    }

    // Dynamic import with variable path prevents TypeScript from resolving
    // the cross-package dependency at compile time, keeping the backend
    // build self-contained. Gracefully handles cron not being available
    // (e.g. in Docker deployments where only the backend is deployed).
    try {
      const cronPath = '../../cron/scheduler.js';
      const { start: startCron } = await import(cronPath);
      startCron();
    } catch (err) {
      console.warn('[Startup] Cron scheduler not available. Scheduled tasks will not run in this deployment.');
    }

    app.listen(config.port, () => {
      console.log(`[GameDayWire] Backend running on port ${config.port}`);

      if (!adminTokenIsFromEnv) {
        const line = '='.repeat(50);
        console.log('');
        console.log(`ADMIN LOGIN TOKEN (auto-generated - not stored, save it now)`);
        console.log(`  Token: ${config.adminToken}`);
        console.log(`  Set ADMIN_TOKEN in .env for a permanent token`);
        console.log(`  ${line}`);
        console.log('');
      } else {
        console.log('[GameDayWire] Admin login configured via ADMIN_TOKEN environment variable.');
      }
    });
  })();
}
