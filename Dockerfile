# GameDayWire Backend -- Multi-stage Dockerfile for Fly.io
# Build: 2026-06-25-v1 — Supabase PostgreSQL migration
# Builds a minimal production image with:
#   - Compiled TypeScript (via tsc)
#   - Prisma Client (generated)
#   - Supabase PostgreSQL database connection (connection string from environment)
#
# Database: Supabase PostgreSQL. Set DATABASE_URL via Fly secrets:
#   fly secrets set DATABASE_URL="postgresql://user:password@host:6543/postgres"
# See docs/supabase-setup.md for setup instructions.

# ---- Base ----
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

# ---- Build (Prisma Client + TypeScript compilation) ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY . .
RUN pnpm --filter backend build

# ---- Runner (minimal production image) ----
FROM base AS runner
WORKDIR /app

# Copy full workspace structure so pnpm can resolve workspace packages correctly.
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY cron/package.json ./cron/

# Install only backend production deps using workspace filter.
RUN pnpm install --no-frozen-lockfile --filter backend

# Copy compiled TypeScript output from build stage
COPY --from=build /app/backend/dist/ ./backend/dist/

# Copy Prisma schema and migrations (needed at runtime for prisma migrate deploy)
COPY --from=build /app/backend/prisma/ ./backend/prisma/

# Generate Prisma Client for the runtime platform architecture
RUN cd backend && ./node_modules/.bin/prisma generate

# Remove non-backend workspace packages to save space
RUN rm -rf frontend cron

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run migrations at startup, then start the server.
# prisma migrate deploy applies pending migrations in a single, atomic step.
CMD npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js
