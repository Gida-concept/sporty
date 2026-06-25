# Deployment Guide — GameDayWire

Complete deployment instructions for the Next.js + Express + PostgreSQL (Supabase) stack across local development, Docker, and production environments.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Building for Production](#2-building-for-production)
3. [apply.build Deployment (Primary)](#3-applybuild-deployment-primary)
4. [Docker Compose Deployment (Alternative)](#4-docker-compose-deployment-alternative)
5. [VPS Deployment (PM2 + Nginx)](#5-vps-deployment-pm2--nginx)
6. [Environment Configuration Reference](#6-environment-configuration-reference)
7. [Verification Checklist](#7-verification-checklist)
8. [Rollback Plan](#8-rollback-plan)
9. [Security Checklist](#9-security-checklist)

---

## 1. Local Development Setup

### 1.1 Prerequisites

| Software    | Minimum Version | Purpose                                    |
| ----------- | --------------- | ------------------------------------------ |
| Node.js     | 20 LTS          | JavaScript runtime                         |
| pnpm        | 9.x             | Package manager (workspaces)               |
| Git         | 2.x             | Version control                            |
| Code Editor | Any             | VS Code recommended with ESLint + Prettier |

### 1.2 Step-by-Step Installation

```bash
# Clone the repository
git clone <repository-url>
cd sporty

# Install all dependencies (both frontend and backend)
pnpm install

# Copy environment file
cp .env.example .env

# Run database migration (creates all tables in PostgreSQL/Supabase)
npx prisma migrate dev

# Seed initial data (keywords, head terms)
pnpm seed

# Start development servers (both frontend and backend)
pnpm dev
```

The `pnpm dev` command starts:

- **Next.js frontend** at `http://localhost:3000`
- **Express backend** at `http://localhost:3001`

### 1.3 Development URLs

| Service      | URL                               | Purpose             |
| ------------ | --------------------------------- | ------------------- |
| Frontend     | http://localhost:3000             | Next.js App Router  |
| Backend API  | http://localhost:3001             | Express.js REST API |
| Health Check | http://localhost:3001/api/health  | System status       |
| Sitemap      | http://localhost:3001/api/sitemap | XML sitemap         |
| RSS Feed     | http://localhost:3001/api/rss     | RSS 2.0 feed        |

### 1.4 Verifying Your Setup

```bash
# Check Node.js version
node -v  # Expect v20.x.x

# Check pnpm version
pnpm -v  # Expect 9.x

# Verify all dependencies are installed
pnpm ls --depth 0

# Verify Prisma client is generated
ls node_modules/.prisma/client/index.js

# Test the backend starts
pnpm --filter backend dev &
sleep 3
curl -s http://localhost:3001/api/health | head -20
```

---

## 2. Building for Production

### 2.1 Build Process

```bash
# Install all dependencies (including production dependencies)
pnpm install --frozen-lockfile

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build the Next.js frontend
pnpm --filter frontend build

# Build the Express backend (TypeScript compilation)
pnpm --filter backend build
```

### 2.2 Build Output

| Service  | Build Output      | Entry Point                    |
| -------- | ----------------- | ------------------------------ |
| Frontend | `frontend/.next/` | `pnpm --filter frontend start` |
| Backend  | `backend/dist/`   | `backend/dist/index.js`        |

### 2.3 Starting Production Servers

```bash
# Start backend (Express API on port 3001)
pnpm --filter backend start

# Start frontend (Next.js on port 3000, proxying API to 3001)
pnpm --filter frontend start
```

For production, use apply.build, Docker, or PM2 (see sections below) instead of running these directly.

---

## 3. apply.build Deployment (Primary)

[apply.build](https://apply.build/) is a European PaaS based in Finland that supports Dockerfile-based deployments. The backend is deployed as a containerized Express.js API connected to Supabase PostgreSQL.

### 3.1 Prerequisites

- **GitHub repository** with the GameDayWire codebase pushed to a branch
- **apply.build account** — sign up at https://apply.build
- **Supabase PostgreSQL instance** — the database is hosted separately on Supabase; apply.build does not provide a managed database
- **API keys** ready: SerpAPI, Groq, and optionally Google Indexing

### 3.2 Step-by-Step Deployment Guide

#### Step 1: Push Code to GitHub

Ensure the repository is pushed to GitHub with all changes committed:

```bash
git add .
git commit -m "Ready for apply.build deployment"
git push origin main
```

#### Step 2: Create App on apply.build

1. Log in to [apply.build](https://apply.build/)
2. Click **Create App**
3. Connect your GitHub repository
4. Select the repository and branch containing GameDayWire

#### Step 3: Choose Build Mode

Select **Dockerfile** as the build mode. The root `Dockerfile` will be used automatically for a multi-stage build:

- Stage 1 (`deps`): Install pnpm dependencies with cache
- Stage 2 (`build`): Generate Prisma Client and compile TypeScript
- Stage 3 (`runner`): Minimal production image with compiled output, Prisma schema/migrations, and production dependencies

apply.build will detect the `Dockerfile` at the repository root and build it natively.

#### Step 4: Configure Environment Variables

Set all environment variables via the apply.build dashboard (**Settings -> Environment Variables**). All values are stored as secrets.

**Core required variables:**

| Variable                        | Required | Description                                               |
| ------------------------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`                  | Yes      | Supabase PostgreSQL connection string (see section 3.3)   |
| `NODE_ENV`                      | Yes      | Set to `production`                                       |
| `PORT`                          | No       | Set to `8080` (matches Dockerfile EXPOSE)                 |
| `SERPAPI_KEY`                   | Yes      | SerpAPI key for search data                               |
| `GROQ_API_KEY`                  | Yes      | Groq API key for AI content generation                    |
| `ADMIN_TOKEN`                   | Yes      | 64-char hex token for admin bearer authentication         |
| `WEBHOOK_SECRET`                | No       | HMAC secret for webhook verification                      |
| `GOOGLE_INDEXING_ENABLED`       | No       | Set to `true` to enable Google Indexing API               |
| `GOOGLE_INDEXING_CLIENT_EMAIL`  | No       | Google service account email (if indexing enabled)        |
| `GOOGLE_INDEXING_PRIVATE_KEY`   | No       | Google service account private key (if indexing enabled)  |
| `NEXT_PUBLIC_API_URL`           | Yes      | The backend URL assigned by apply.build (e.g. `https://gamedaywire.apply.build`) |

**Important:** Do NOT commit any of these values to version control. Set them exclusively through the apply.build dashboard.

#### Step 5: Configure Supabase PostgreSQL Connection

The `DATABASE_URL` should use Supabase's connection pooling (port 6543) for production:

```
DATABASE_URL=postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

Obtain this from your Supabase project dashboard under **Project Settings -> Database -> Connection string -> URI**.

#### Step 6: Deploy

Click **Deploy** on the apply.build dashboard. The platform will:

1. Clone the repository
2. Build the Dockerfile
3. Start the container with the configured environment variables
4. Run database migrations automatically via the Dockerfile CMD: `npx prisma migrate deploy`
5. Start the Express.js backend on port 8080

#### Step 7: Verify Deployment

Check the deployment logs in the apply.build dashboard. Once running, verify:

```bash
# Health check
curl -s https://your-app.apply.build/api/health

# Should return:
# {"status":"ok","checks":{"database":{"status":"ok"},"serpapi":{...},"groq":{...}}}
```

### 3.3 Supabase PostgreSQL Connection

The database is hosted on **Supabase** (not apply.build). Ensure your Supabase project:

1. Has the `gamedaywire` database created (or uses the default `postgres` database)
2. Has SSL mode enabled (add `?sslmode=require` to the connection string)
3. Uses connection pooling port `6543` for production connections
4. Has the IP range for apply.build allowed (if Supabase project has network restrictions)

Run the initial migration from your local machine before deploying:

```bash
npx prisma migrate deploy
```

### 3.4 Updating the Application

apply.build automatically rebuilds and redeploys when changes are pushed to the connected branch:

```bash
git push origin main
```

Alternatively, trigger a manual redeploy from the apply.build dashboard.

### 3.5 Monitoring and Logs

- **Deployment logs**: View build and runtime logs in the apply.build dashboard
- **Health checks**: The Dockerfile includes a `HEALTHCHECK` that polls `/api/health` every 30 seconds
- **Application logs**: Access live logs from the dashboard's Logs section

### 3.6 Scaling

apply.build handles container orchestration. For increased capacity:

- Upgrade your apply.build plan for more resources
- Optimize the in-memory cache (see `backend/src/middleware/cache.ts` — LRU with 10K entries)
- Ensure Supabase PostgreSQL connection pool limits are adequate (Supabase Pro plan offers 15 connections minimum)

---

## 4. Docker Compose Deployment (Alternative)

For self-hosting or local containerized testing, use Docker Compose.

### 4.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3001:3001'
    volumes:
      - backend_data:/app/data
      - backend_cache:/app/cache
      - backend_logs:/app/logs
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok?0:1))",
        ]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - '3000:3000'
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://backend:3001
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  backend_data:
  backend_cache:
  backend_logs:
```

### 4.2 Dockerfile — Backend

The root `Dockerfile` is the production backend image. It uses a multi-stage build:

```dockerfile
# Root Dockerfile — Multi-stage build
# Stage 1 (deps): Install pnpm dependencies
# Stage 2 (build): Generate Prisma Client + compile TypeScript
# Stage 3 (runner): Minimal production image

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY . .
RUN pnpm --filter backend build

FROM base AS runner
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY cron/package.json ./cron/
RUN pnpm install --no-frozen-lockfile --filter backend
COPY --from=build /app/backend/dist/ ./backend/dist/
COPY --from=build /app/backend/prisma/ ./backend/prisma/
RUN cd backend && ./node_modules/.bin/prisma generate
RUN rm -rf frontend cron
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js
```

### 4.3 Dockerfile — Frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN pnpm --filter frontend build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["pnpm", "--filter", "frontend", "start"]
```

### 4.4 Running with Docker

```bash
# Build and start all services
docker compose up -d --build

# Check logs
docker compose logs -f

# Stop all services
docker compose down

# Backup the PostgreSQL database
pg_dump "$DATABASE_URL" > ./backups/prod-$(date +%Y%m%d).sql
```

---

## 5. VPS Deployment (PM2 + Nginx)

### 5.1 Server Prerequisites

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm globally
sudo corepack enable && corepack prepare pnpm@9 --activate

# Install PM2 globally
pnpm add -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot (for SSL)
sudo apt-get install -y certbot python3-certbot-nginx
```

### 5.2 Deploying the Application

```bash
# Clone the repository
git clone <repository-url> /var/www/sporty
cd /var/www/sporty

# Install dependencies
pnpm install --frozen-lockfile

# Set up environment
cp .env.example .env
# Edit .env with production values
nano .env

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Seed initial data
pnpm seed

# Build the application
pnpm build
```

### 5.3 PM2 Configuration

```javascript
// ecosystem.config.js (project root)
module.exports = {
  apps: [
    {
      name: 'sporty-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      out_file: '../logs/pm2/backend-out.log',
      error_file: '../logs/pm2/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '500M',
    },
    {
      name: 'sporty-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      out_file: '../logs/pm2/frontend-out.log',
      error_file: '../logs/pm2/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '500M',
    },
  ],
};
```

```bash
# Start both services with PM2
pm2 start ecosystem.config.js

# Save PM2 process list (auto-restart on reboot)
pm2 save
pm2 startup
```

### 5.4 Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/sporty
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API (Express backend)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Deny access to sensitive paths
    location ~ /\.(env|git|data|prisma) {
        deny all;
        return 404;
    }

    location ~ /(node_modules|data|cache|logs) {
        deny all;
        return 404;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_vary on;

    # Logs
    access_log /var/log/nginx/sporty-access.log;
    error_log /var/log/nginx/sporty-error.log;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/sporty /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5.5 SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (certbot adds a systemd timer automatically)
sudo certbot renew --dry-run
```

### 5.6 PM2 Monitoring Commands

```bash
# View process status
pm2 status

# View logs
pm2 logs sporty-backend
pm2 logs sporty-frontend

# Monitor CPU/memory
pm2 monit

# Restart a service
pm2 restart sporty-backend

# Stop a service
pm2 stop sporty-backend

# Reload after code update
pm2 reload ecosystem.config.js
```

---

## 6. Environment Configuration Reference

The `.env` file contains all configuration for the system. Below is the complete reference:

| Variable                         | Required | Default                   | Purpose                                           |
| -------------------------------- | -------- | ------------------------- | ------------------------------------------------- |
| `DATABASE_URL`                   | Yes      | `postgresql://...`        | PostgreSQL connection string (Supabase)              |
| `SERPAPI_KEY`                    | Yes      | —                         | SerpAPI key for search data                       |
| `GROQ_API_KEY`                   | Yes      | —                         | Groq API key for AI generation                    |
| `GROQ_MODEL`                     | No       | `llama4-70b`              | Groq model for content generation                 |
| `GOOGLE_INDEXING_CLIENT_EMAIL`   | No       | —                         | GCP service account email                         |
| `GOOGLE_INDEXING_PRIVATE_KEY`    | No       | —                         | GCP service account private key                   |
| `GOOGLE_SEARCH_CONSOLE_PROPERTY` | No       | —                         | Search Console property                           |
| `CLOUDFLARE_API_TOKEN`           | No       | —                         | Cloudflare API token for cache purge              |
| `CLOUDFLARE_ZONE_ID`             | No       | —                         | Cloudflare zone ID                                |
| `CLOUDFLARE_EMAIL`               | No       | —                         | Cloudflare account email                          |
| `SITE_URL`                       | Yes      | `http://localhost:3000`   | Canonical site URL                                |
| `SITE_NAME`                      | No       | `GameDayWire`             | Site name for schema, RSS                         |
| `SITE_LOCALE`                    | No       | `en_US`                   | Language/locale                                   |
| `ADMIN_EMAIL`                    | No       | —                         | Admin email for alerts                            |
| `WEBHOOK_SECRET`                 | No       | —                         | HMAC secret for webhook                           |
| `ADMIN_TOKEN`                    | Yes      | —                         | 64-char hex token for admin bearer authentication |
| `NEXT_PUBLIC_API_URL`            | Yes      | `http://localhost:3001`   | API URL (frontend -> backend)                      |
| `PORT`                           | No       | `3001`                    | Backend Express port                              |
| `ARTICLES_PER_DAY`               | No       | `2`                       | Articles generated daily                          |
| `MORNING_HOUR`                   | No       | `8`                       | UTC hour for morning article                      |
| `EVENING_HOUR`                   | No       | `19`                      | UTC hour for evening article                      |
| `MIN_SEARCH_VOLUME`              | No       | `500`                     | Minimum search volume for keywords                |
| `MAX_KEYWORD_DIFFICULTY`         | No       | `40`                      | Maximum keyword difficulty (0-100)                |
| `MIN_CPC`                        | No       | `0.50`                    | Minimum CPC in USD                                |
| `TARGET_COUNTRIES`               | No       | `US,GB,CA,AU,IE,NZ,ZA,IN` | Target markets                                    |
| `ENABLE_AUTO_PUBLISH`            | No       | `true`                    | Auto-publish without review                       |
| `ENABLE_CONTENT_REFRESH`         | No       | `true`                    | Enable auto-refresh                               |
| `ENABLE_LINK_REBUILD`            | No       | `true`                    | Enable weekly link rebuild                        |
| `ENABLE_SEO_AUDIT`               | No       | `true`                    | Enable weekly SEO audit                           |
| `ENABLE_NOTIFICATIONS`           | No       | `true`                    | Enable email/webhook alerts                       |
| `MAX_INTERNAL_LINKS`             | No       | `5`                       | Max internal links per article                    |
| `MAX_EXTERNAL_LINKS`             | No       | `3`                       | Max external links per article                    |
| `MIN_WORD_COUNT`                 | No       | `800`                     | Minimum article word count                        |
| `MAX_WORD_COUNT`                 | No       | `1500`                    | Maximum article word count                        |
| `TARGET_READING_LEVEL`           | No       | `65`                      | Target Flesch-Kincaid score                       |
| `BACKUP_DIR`                     | No       | `./backups`               | Backup directory path                             |
| `LOG_LEVEL`                      | No       | `info`                    | Logging level                                     |
| `NODE_ENV`                       | Yes      | `development`             | Environment (development/production)              |

**For apply.build deployment**: Set these values via the **Settings -> Environment Variables** section of the dashboard. All values are stored as secrets and are never exposed in logs or build output.

---

## 7. Verification Checklist

### 7.1 API Health Check

```bash
curl -s http://localhost:3001/api/health | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log('Status:', j.status);
console.log('Database:', j.checks.database.status);
console.log('SerpAPI:', j.checks.serpapi.status);
console.log('Groq:', j.checks.groq.status);
"
```

### 7.2 Trends API

```bash
curl -s "http://localhost:3001/api/trends?limit=5" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log('Trends found:', j.count);
console.log('Cached:', j.cached);
"
```

### 7.3 Sitemap Verification

```bash
# Validate sitemap index
curl -s http://localhost:3001/api/sitemap | head -20

# Validate article sitemap
curl -s "http://localhost:3001/api/sitemap?type=articles&page=1" | head -20
```

### 7.4 RSS Feed

```bash
# Check RSS feed structure
curl -s http://localhost:3001/api/rss | head -20

# Check category filtering
curl -s "http://localhost:3001/api/rss?category=sports" | head -20
```

### 7.5 Cron Script Verification

```bash
# Test each cron script in dry-run mode
node -e "
const { trendMonitor } = require('./cron/trendMonitor');
trendMonitor({ dryRun: true }).then(console.log).catch(console.error);
"
```

### 7.6 Database Verification

```bash
# Check that PostgreSQL is reachable
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const result = await prisma.\$queryRawUnsafe(
    \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name\"
  );
  console.log('Tables:', result.map(t => t.table_name).join(', '));
  await prisma.\$disconnect();
}
check();
"
```

---

## 8. Rollback Plan

### 8.1 Pre-Deployment Preparation

```bash
# Back up the PostgreSQL database
pg_dump "$DATABASE_URL" > backend/prisma/db.pre-deploy.sql

# Back up the current build
tar -czf pre-deploy-backup.tar.gz --exclude='node_modules' --exclude='.next' --exclude='dist' .

# Record current PM2 state
pm2 list > pre-deploy-pm2-state.txt
```

### 8.2 Rollback Scenarios

**Scenario A: Files Only (No Database Changes)**

```bash
# Restore previous build
git stash
pnpm install --frozen-lockfile
pnpm build

# Restart services
pm2 reload ecosystem.config.js
```

**Scenario B: Files and Database Changes**

```bash
# Restore database (if migration introduced issues)
psql "$DATABASE_URL" < backend/prisma/db.pre-deploy.sql

# Revert Prisma migration
npx prisma migrate resolve --rolled-back "migration_name"

# Regenerate Prisma client
npx prisma generate

# Restore files (same as Scenario A)
git stash
pnpm install --frozen-lockfile
pnpm build
pm2 reload ecosystem.config.js
```

**Scenario C: Configuration Error**

```bash
# Restore .env from backup
cp .env.bak .env

# Restart services
pm2 restart sporty-backend
```

**apply.build Rollback:**

- Redeploy a previous version from the apply.build dashboard by selecting a prior build
- Or push a revert commit to trigger a rebuild of the last known-good state

---

## 9. Security Checklist

### 9.1 File and Directory Security

- [ ] `.env` has permissions `600`:
  ```bash
  chmod 600 .env
  ```
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] `node_modules/` is not web-accessible
- [ ] `prisma/` directory is not web-accessible
- [ ] `data/` (local database) is not web-accessible
- [ ] `cache/` directory is not web-accessible
- [ ] `logs/` directory is not web-accessible

### 9.2 HTTP Security Headers

Verify with Nginx configuration:

- [ ] HTTPS enforced (HTTP -> HTTPS redirect)
- [ ] `Strict-Transport-Security` present (max-age=31536000)
- [ ] `X-Frame-Options: DENY` present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` present
- [ ] `Permissions-Policy` restricts sensitive features

```bash
curl -sI https://yourdomain.com | grep -E "(X-Frame|X-Content|Referrer|Strict-Transport|Permissions-Policy)"
```

### 9.3 Application Security

- [ ] No API keys exposed in client-side code
- [ ] Rate limiting enabled on all API endpoints
- [ ] CORS configured to allow only the frontend domain
- [ ] SerpAPI and Groq keys stored in `.env` only
- [ ] `robots.txt` does not Disallow article paths
- [ ] Admin email set to monitored address
- [ ] Admin API endpoints require valid bearer token
- [ ] `ADMIN_TOKEN` is a strong 64-char hex string stored only in `.env`

### 9.4 Admin Access Verification

```bash
# Test admin login endpoint
curl -s -X POST "http://localhost:3001/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"YOUR_ADMIN_TOKEN\"}"

# Verify dashboard stats (authenticated)
curl -s "http://localhost:3001/api/admin/stats" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" | node -e "
const d = require('fs').readFileSync('/dev/stdin','utf8');
const j = JSON.parse(d);
console.log('Total articles:', j.data.total_articles);
console.log('Total pageviews:', j.data.total_pageviews);
"
```

### 9.5 Database Security

- [ ] PostgreSQL connection uses SSL (enforced by Supabase)
- [ ] Database credentials stored only in `.env` / apply.build secrets
- [ ] Regular backups configured (see [cron-jobs.md](cron-jobs.md))
