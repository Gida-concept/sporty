import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Admin token resolution: use env var if set, otherwise auto-generate
function resolveAdminToken(): { token: string; fromEnv: boolean } {
  const envToken = process.env.ADMIN_TOKEN;
  if (envToken && envToken.trim().length > 0) {
    return { token: envToken.trim(), fromEnv: true };
  }
  return { token: crypto.randomUUID(), fromEnv: false };
}

const _adminTokenResult = resolveAdminToken();
export const adminTokenIsFromEnv = _adminTokenResult.fromEnv;

export interface AppConfig {
  // Server (startup-only, not admin-configurable)
  port: number;
  nodeEnv: string;

  // Database (connection string, not admin-configurable)
  databaseUrl: string;

  // External API keys (secrets — stay in .env)
  serpApiKey: string;
  groqApiKey: string;

  // SerpAPI quota limits
  serpApiDailyLimit: number;
  serpApiMonthlyLimit: number;

  // Auth secrets — stay in .env
  adminToken: string;
  webhookSecret: string;

  // Session configuration
  adminSessionTtlMs: number;

  // Site URL (frontend URL, used for sitemaps and search engine pings)
  siteUrl: string;
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

  databaseUrl: envString('DATABASE_URL', 'postgresql://localhost:5432/sporty'),

  serpApiKey: envString('SERPAPI_KEY'),
  groqApiKey: envString('GROQ_API_KEY'),

  serpApiDailyLimit: envInt('SERPAPI_DAILY_LIMIT', 100),
  serpApiMonthlyLimit: envInt('SERPAPI_MONTHLY_LIMIT', 3000),

  adminToken: _adminTokenResult.token,
  webhookSecret: envString('WEBHOOK_SECRET', 'dev-webhook-secret'),

  adminSessionTtlMs: envInt('ADMIN_SESSION_TTL', 86400000),

  siteUrl: envString('SITE_URL', 'http://localhost:3000'),
};

export function validateConfig(): void {
  const requiredEnvVars: Array<{ key: string; value: string; name: string }> = [
    { key: 'SERPAPI_KEY', value: config.serpApiKey, name: 'SerpAPI Key' },
    { key: 'GROQ_API_KEY', value: config.groqApiKey, name: 'Groq API Key' },
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
    { key: 'WEBHOOK_SECRET', value: config.webhookSecret, name: 'Webhook Secret' },
  ];

  for (const fb of devFallbacks) {
    if (fb.value === 'dev-webhook-secret') {
      if (config.nodeEnv === 'production') {
        throw new Error(`Environment variable ${fb.key} is set to the development fallback value. Set a secure value for production.`);
      } else {
        console.warn(`Warning: ${fb.key} is using the development fallback value. Set a secure value for production.`);
      }
    }
  }

  // Production guard: ADMIN_TOKEN must be explicitly set in production
  if (config.nodeEnv === 'production' && !adminTokenIsFromEnv) {
    throw new Error(
      'ADMIN_TOKEN must be set in the .env file for production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
}
