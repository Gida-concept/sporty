# GameDayWire Backend -- Multi-stage Dockerfile for Fly.io
# Builds a minimal production image with:
#   - Compiled TypeScript (via tsc)
#   - Prisma Client (generated)
#   - Turso (libSQL) database connection (connection string from environment)
#   - Relative imports (no tsconfig-paths needed)
#
# Database: Turso (libSQL). Set DATABASE_URL and TURSO_AUTH_TOKEN via Fly secrets:
#   fly secrets set DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your_token"
# See docs/turso-setup.md for setup instructions.

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
# This avoids the "ERR_PNPM_OUTDATED_LOCKFILE" error that occurs when
# backend/package.json is flattened to root (the lockfile's root importers
# section expects eslint, prettier etc., not express, prisma, etc.).
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY cron/package.json ./cron/

# Install only backend production deps using workspace filter.
# --frozen-lockfile respects pnpm-lock.yaml exactly.
RUN pnpm install --no-frozen-lockfile --filter backend

# Prisma is already a dependency in backend/package.json; the local binary
# at backend/node_modules/.bin/prisma is installed by pnpm install above.

# Copy compiled TypeScript output from build stage
COPY --from=build /app/backend/dist/ ./backend/dist/

# Copy Prisma schema and migrations (needed at runtime for Prisma Client)
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

CMD backend/node_modules/.bin/prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js
