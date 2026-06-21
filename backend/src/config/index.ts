import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface AppConfig {
  // Server
  port: number;
  nodeEnv: string;
  siteUrl: string;

  // Database
  databaseUrl: string;

  // APIs
  serpApiKey: string;
  groqApiKey: string;

  // Google Indexing API
  googleIndexingEnabled: boolean;
  googleServiceAccountEmail: string;
  googlePrivateKey: string;

  // Auth
  adminToken: string;
  webhookSecret: string;

  // Content
  defaultCategory: string;
  maxGenerationAttempts: number;
  minWordCount: number;

  // Cache
  cacheTtlSeconds: number;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  adminRateLimitMaxRequests: number;
  generateRateLimitMaxRequests: number;

  // Cron
  cronEnabled: boolean;

  // Logging
  logLevel: string;
}

function envString(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

function envInt(key: string, defaultValue: number): number {
  const val = parseInt(process.env[key] || '', 10);
  return isNaN(val) ? defaultValue : val;
}

function envBool(key: string, defaultValue: boolean): boolean {
  if (process.env[key] === undefined) return defaultValue;
  return process.env[key] === 'true' || process.env[key] === '1';
}

export const config: AppConfig = {
  port: envInt('PORT', 3001),
  nodeEnv: envString('NODE_ENV', 'development'),
  siteUrl: envString('SITE_URL', 'http://localhost:3000'),

  databaseUrl: envString('DATABASE_URL', 'file:./dev.db'),

  serpApiKey: envString('SERPAPI_KEY'),
  groqApiKey: envString('GROQ_API_KEY'),

  googleIndexingEnabled: envBool('GOOGLE_INDEXING_ENABLED', false),
  googleServiceAccountEmail: envString('GOOGLE_INDEXING_CLIENT_EMAIL'),
  googlePrivateKey: envString('GOOGLE_INDEXING_PRIVATE_KEY'),

  adminToken: envString('ADMIN_TOKEN', 'dev-admin-token'),
  webhookSecret: envString('WEBHOOK_SECRET', 'dev-webhook-secret'),

  defaultCategory: envString('DEFAULT_CATEGORY', 'sports'),
  maxGenerationAttempts: envInt('MAX_GENERATION_ATTEMPTS', 3),
  minWordCount: envInt('MIN_WORD_COUNT', 800),

  cacheTtlSeconds: envInt('CACHE_TTL_SECONDS', 300),

  rateLimitWindowMs: envInt('RATE_LIMIT_WINDOW_MS', 900000),
  rateLimitMaxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 100),
  adminRateLimitMaxRequests: envInt('ADMIN_RATE_LIMIT_MAX_REQUESTS', 30),
  generateRateLimitMaxRequests: envInt('GENERATE_RATE_LIMIT_MAX_REQUESTS', 5),

  cronEnabled: envBool('CRON_ENABLED', true),
  logLevel: envString('LOG_LEVEL', 'info'),
};

export function validateConfig(): void {
  const requiredEnvVars: Array<{ key: string; value: string; name: string }> = [
    { key: 'SERPAPI_KEY', value: config.serpApiKey, name: 'SerpAPI Key' },
    { key: 'GROQ_API_KEY', value: config.groqApiKey, name: 'Groq API Key' },
    { key: 'ADMIN_TOKEN', value: config.adminToken, name: 'Admin Token' },
    { key: 'DATABASE_URL', value: config.databaseUrl, name: 'Database URL' },
  ];

  const missing = requiredEnvVars.filter((r) => !r.value);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map((m) => `${m.key} (${m.name})`).join(', ')}`,
    );
  }

  // Guard against dev fallback defaults in production
  const devFallbacks: Array<{ key: string; value: string; name: string }> = [
    { key: 'ADMIN_TOKEN', value: config.adminToken, name: 'Admin Token' },
    { key: 'WEBHOOK_SECRET', value: config.webhookSecret, name: 'Webhook Secret' },
  ];

  for (const fb of devFallbacks) {
    if (fb.value === (fb.key === 'ADMIN_TOKEN' ? 'dev-admin-token' : 'dev-webhook-secret')) {
      if (config.nodeEnv === 'production') {
        throw new Error(`Environment variable ${fb.key} is set to the development fallback value. Set a secure value for production.`);
      } else {
        console.warn(`Warning: ${fb.key} is using the development fallback value. Set a secure value for production.`);
      }
    }
  }
}
