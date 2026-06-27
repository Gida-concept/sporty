# Deployment Guide — GameDayWire

Complete deployment instructions for the Next.js + Express + PostgreSQL (Supabase) stack across local development, Docker, and production environments.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Building for Production](#2-building-for-production)
3. [Fly.io Deployment (Primary)](#3-flyio-deployment-primary)
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
| npm         | 10.x            | Package manager (workspaces)               |
| Git         | 2.x             | Version control                            |
| Code Editor | Any             | VS Code recommended with ESLint + Prettier |

### 1.2 Step-by-Step Installation

```bash
# Clone the repository
git clone <repository-url>
cd sporty

# Install all dependencies (both frontend and backend)
npm install

# Copy environment file
cp .env.example .env

# Run database migration (creates all tables in PostgreSQL/Supabase)
npx prisma migrate dev

# Seed initial data (keywords, head terms)
npm run seed

# Start development servers (both frontend and backend)
npm run dev
```

The `npm run dev` command starts:

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

# Check npm version
npm -v  # Expect 10.x

# Verify all dependencies are installed
npm ls --depth 0

# Verify Prisma client is generated
ls node_modules/.prisma/client/index.js

# Test the backend starts
npm run dev -w backend &
sleep 3
curl -s http://localhost:3001/api/health | head -20
```

---

## 2. Building for Production

### 2.1 Build Process

```bash
# Install all dependencies (including production dependencies)
npm ci

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build the Next.js frontend
npm run build -w frontend

# Build the Express backend (TypeScript compilation)
npm run build -w backend
```

### 2.2 Build Output

| Service  | Build Output      | Entry Point                    |
| -------- | ----------------- | ------------------------------ |
| Frontend | `frontend/.next/` | `npm run start -w frontend`     |
| Backend  | `backend/dist/`   | `backend/dist/index.js`        |

### 2.3 Starting Production Servers

```bash
# Start backend (Express API on port 3001)
npm run start -w backend

# Start frontend (Next.js on port 3000, proxying API to 3001)
npm run start -w frontend
```

For production, use Fly.io, Docker, or PM2 (see sections below) instead of running these directly.

---

## 3. Fly.io Deployment (Primary)

Fly.io is the primary deployment platform for the GameDayWire backend. It runs the Express.js API in a Docker container connected to Supabase PostgreSQL.

### 3.1 Prerequisites

- **Fly.io account** — sign up at https://fly.io and install the CLI:
  ```bash
  curl -L https://fly.io/install.sh | sh
  # Or on Windows (PowerShell):
  # powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
  ```
- **Supabase PostgreSQL instance** — the database is hosted separately on Supabase
- **API keys** ready: SerpAPI and Groq
- **Docker** installed locally (for testing builds)
- **Logged into Fly CLI**:
  ```bash
  fly auth login
  ```

### 3.2 Configuration Files

Docker and Fly.io configuration is split between the project root and `backend/`:

| File | Purpose |
|------|---------|
| `fly.toml` | Root Fly.io config for CI and local deploys without --config |
| `.dockerignore` | Docker build context exclusions (read from build context root) |
| `backend/Dockerfile` | Multi-stage production Docker image |
| `backend/Dockerfile.dev` | Dev mode with hot reload (tsx watch) |
| `backend/fly.toml` | Authoritative Fly.io app configuration (use with `--config`) |
| `backend/.dockerignore` | Reference copy (Docker reads `.dockerignore` from build context root only) |

### 3.3 Step-by-Step Deployment Guide

#### Step 1: Ensure Prisma Migrations Exist

Before deploying, create your initial database migration if it does not already exist:

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

Commit the migration files to version control:

```bash
git add backend/prisma/migrations/
git commit -m "Add initial Prisma migration"
```

#### Step 2: Create the Fly.io App

Run this from the **monorepo root** (the `sporty/` directory):

```bash
fly launch \
  --config backend/fly.toml \
  --dockerfile backend/Dockerfile \
  --no-deploy \
  --name gamedaywire-api
```

This creates the app on Fly.io but does not deploy it yet. The `--name` flag sets your app name (change as desired).

If you already created the app from the Fly.io dashboard, skip this step and ensure your `backend/fly.toml` has the correct `app` name.

#### Step 3: Set Environment Secrets

Set all secrets via the Fly.io CLI. These are encrypted at rest and injected as environment variables at runtime:

```bash
# Required secrets
fly secrets set DATABASE_URL="postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require"
fly secrets set SERPAPI_KEY="your-serpapi-key-here"
fly secrets set GROQ_API_KEY="your-groq-api-key-here"
fly secrets set ADMIN_TOKEN="your-64-char-hex-token"

# Optional secrets
fly secrets set WEBHOOK_SECRET="your-webhook-secret"
```

**Important:** Run `fly secrets set` from the directory containing `fly.toml`, or use `--config`:
```bash
fly secrets set KEY=VALUE --config backend/fly.toml
```

The `DATABASE_URL` should use Supabase's connection pooling (port **6543**) for production:

```
DATABASE_URL=postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
```

Obtain this from your Supabase project dashboard under **Project Settings -> Database -> Connection string -> URI**.

#### Step 4: Deploy

Deploy from the **monorepo root**:

```bash
fly deploy --config backend/fly.toml
```

Fly.io will:
1. Upload the build context (monorepo root — includes `package-lock.json` for workspace resolution)
2. Build the Docker image using `backend/Dockerfile` (multi-stage build)
3. Start the container with your secrets injected as environment variables
4. Run database migrations automatically via `npx prisma migrate deploy`
5. Start the Express.js backend on port 8080
6. Begin health check polling at `/api/health`

#### Step 5: Verify Deployment

```bash
# Health check
curl -s https://gamedaywire.fly.dev/api/health

# Expected response:
# {"success":true,"status":"healthy","checks":{"database":{"status":"ok","latency_ms":3}}}
```

Check deployment logs:

```bash
fly logs --config backend/fly.toml
```

### 3.4 Build Process Details

The Dockerfile (`backend/Dockerfile`) uses a 4-stage build:

| Stage | Purpose | Contents |
|-------|---------|----------|
| `base` | Alpine base with OpenSSL | `node:20-alpine`, OpenSSL for Prisma |
| `deps` | Install dependencies | All deps (including devDeps for Prisma generate + tsc) |
| `build` | Compile TypeScript + Prisma | `prisma generate`, `npx tsc` |
| `runner` | Minimal production image | Production deps only, compiled output, Prisma schema, non-root user |

Key design decisions:

- **`node:20-alpine`**: Minimal base image (~125MB) with excellent security posture
- **OpenSSL**: Required by Prisma for TLS connections to Supabase PostgreSQL
- **Prisma client regenerated in runner**: Ensures the Prisma query engine binary matches the runtime CPU architecture (critical when building on ARM Macs and deploying on AMD64 Fly.io machines)
- **Non-root user**: `appuser` (UID 1001) runs the application for security hardening
- **Health check**: Polls `/api/health` every 30 seconds; returns 503 when database is unreachable
- **`npm ci`**: Ensures reproducible builds by failing if lockfile is out of date

### 3.5 Updating the Application

Push code changes to GitHub. The GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys automatically:

```bash
git push origin main
```

**Or deploy directly from local:**

```bash
fly deploy --config backend/fly.toml
```

Fly.io rebuilds the Docker image from scratch on each deploy. The Docker layer cache helps speed this up — dependency layers are cached unless `package-lock.json` changes.

### 3.6 Monitoring and Logs

```bash
# View live logs
fly logs --config backend/fly.toml

# View machine status
fly status --config backend/fly.toml

# SSH into the running container (debugging)
fly ssh console --config backend/fly.toml

# View metrics (CPU, memory, network)
fly metrics --config backend/fly.toml
```

### 3.7 Scaling

```bash
# Scale to 2 machines (for high availability)
fly scale count 2 --config backend/fly.toml

# Scale memory (512MB shared CPU)
fly scale memory 1024 --config backend/fly.toml

# Scale to dedicated CPU
fly scale vm performance-1x --config backend/fly.toml
```

The backend uses in-memory LRU caching (10K entries, 120s TTL) which works best with sticky sessions or a single machine. For multi-machine deployments, consider adding Redis for a shared cache layer.

### 3.8 Managing Secrets

```bash
# List secrets (shows keys only)
fly secrets list --config backend/fly.toml

# Update a secret
fly secrets set KEY=new-value --config backend/fly.toml

# Remove a secret
fly secrets unset KEY --config backend/fly.toml
```

Secrets are encrypted at rest and only decrypted at container startup. Changing a secret requires a redeploy (`fly deploy`).

### 3.9 Local Docker Testing

Test the production Docker image locally before deploying:

```bash
# Build the image
docker build -f backend/Dockerfile -t gamedaywire-api .

# Run with local env vars
docker run -it --rm \
  -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e SERPAPI_KEY="..." \
  -e GROQ_API_KEY="..." \
  -e ADMIN_TOKEN="test-token" \
  -e NODE_ENV="production" \
  gamedaywire-api

# Test health endpoint
curl http://localhost:8080/api/health
```

### 3.10 Supabase PostgreSQL Connection

The database is hosted on **Supabase** (not Fly.io). Ensure your Supabase project:

1. Has SSL mode enabled (add `?sslmode=require` to the connection string)
2. Uses connection pooling port **6543** for production connections
3. Has the appropriate network access configured (Supabase allows all IPs by default on Pro plan)
4. Connection pool settings are adequate (Supabase Pro offers 15 connections minimum)

Run the initial migration from your local machine before deploying:

```bash
cd backend
npx prisma migrate deploy
cd ..
```

### 3.11 GitHub Actions CI/CD (Automated Deployments)

A GitHub Actions workflow at `.github/workflows/deploy.yml` automatically deploys the backend to Fly.io on every push to the `main` branch.

#### How It Works

1. On push to `main`, GitHub Actions checks out the repository
2. Installs the `flyctl` CLI
3. Runs `flyctl deploy --remote-only --config backend/fly.toml` from the repo root
4. Fly.io's remote builder builds the Docker image using `backend/Dockerfile`
5. The image is pushed to Fly.io's registry and deployed

#### Prerequisites

The workflow requires a **Fly.io deploy token** stored as a GitHub Actions secret:

1. Generate a deploy token for the `gamedaywire-api` app:
   ```bash
   fly tokens create deploy -a gamedaywire-api
   ```
   Copy the output token.

2. Add it to GitHub repository secrets:
   - Go to your repo on GitHub: **Settings -> Secrets and variables -> Actions**
   - Click **New repository secret**
   - Name: `FLY_API_TOKEN`
   - Value: paste the deploy token from step 1

#### Disable Fly.io Native GitHub Integration

If you previously connected Fly.io's native GitHub integration (which auto-generates a stock Dockerfile), **disable it** to avoid duplicate builds and conflicts:

- Go to the **Fly.io dashboard** -> **gamedaywire-api** app -> **Deploy** section
- Disable or remove the GitHub integration
- Or, if you used the Fly.io "Launch" wizard, ensure no auto-deploy hooks remain

The `.github/workflows/deploy.yml` workflow replaces the native integration entirely.

#### Manual CI Deploy

You can also trigger the workflow manually from the GitHub Actions tab:

1. Navigate to your repo on GitHub
2. Click **Actions** -> **Deploy to Fly.io** -> **Run workflow**

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
      dockerfile: backend/Dockerfile
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

The production Dockerfile is at `backend/Dockerfile`. It uses a multi-stage build (see [section 3.4](#34-build-process-details) for the full breakdown). The file is extensively commented and serves as the source of truth for the build process.

To build the backend image independently:

```bash
# Build from monorepo root (build context must include npm workspace files)
docker build -f backend/Dockerfile -t gamedaywire-api .
```

### 4.3 Dockerfile — Frontend (if deploying alongside)

The frontend is not deployed on Fly.io. If you need a frontend Dockerfile, see the reference below:

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build -w frontend

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "frontend"]
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

# Install PM2 globally
npm install -g pm2

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
npm ci

# Set up environment
cp .env.example .env
# Edit .env with production values
nano .env

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Seed initial data
npm run seed

# Build the application
npm run build
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

**For Fly.io deployment**: Set these values via `fly secrets set` (see [section 3.3](#33-step-by-step-deployment-guide)). All values are stored as encrypted secrets and are never exposed in logs or build output.

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
npm ci
npm run build

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
npm ci
npm run build
pm2 reload ecosystem.config.js
```

**Scenario C: Configuration Error**

```bash
# Restore .env from backup
cp .env.bak .env

# Restart services
pm2 restart sporty-backend
```

**Fly.io Rollback:**

- Redeploy a previous version from the Fly.io dashboard by selecting a prior build or using `fly deploy --image ...`
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
- [ ] Database credentials stored only in `.env` / Fly.io secrets
- [ ] Regular backups configured (see [cron-jobs.md](cron-jobs.md))
