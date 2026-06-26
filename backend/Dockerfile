# =============================================================================
# GameDayWire Backend — Multi-stage Dockerfile for Fly.io
# =============================================================================
# Builds a minimal production image with:
#   - Compiled TypeScript (via tsc)
#   - Prisma Client (generated for runtime platform)
#   - Supabase PostgreSQL connection (connection string from environment secrets)
#
# BUILD CONTEXT: The monorepo ROOT (sporty/), not the backend/ subdirectory.
# This is required for npm workspaces resolution (package-lock.json,
# and root package.json with workspaces field must be present).
#
# Usage:
#   docker build -f backend/Dockerfile -t gamedaywire-api .
#
#   Fly.io (from monorepo root):
#     fly deploy --config backend/fly.toml
#
#   Fly.io (with explicit dockerfile):
#     fly deploy --dockerfile backend/Dockerfile
#
# Set all secrets via Fly.io secrets (fly secrets set KEY=VALUE)
# See docs/deployment.md for the full environment variable reference.
# =============================================================================

# ---- Stage 1: Alpine base ----
# node:20-alpine is minimal (~125MB) and has excellent security posture.
# OpenSSL is required by Prisma's database client for TLS connections
# to Supabase PostgreSQL.
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# ---- Stage 2: Dependencies ----
# Install ALL dependencies (including devDependencies) needed for
# Prisma Client generation and TypeScript compilation.
#
# The root package.json declares workspaces: ["frontend", "backend", "cron"].
# npm ci requires ALL workspace package.json files to be present to resolve
# the dependency tree. We copy all of them even though only backend is
# needed for the production image.
#
# Layer caching strategy: Because we only copy the lockfile and workspace
# metadata BEFORE the source code, Docker can cache this layer and only
# rebuild when dependencies change (not when source changes).
FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY cron/package.json ./cron/
RUN npm ci

# ---- Stage 3: Build ----
# Generate Prisma Client and compile TypeScript.
# Both steps run inside the build stage so that dev dependencies
# (typescript, @types/*) are available without polluting the final image.
#
# The root package.json is needed here so that `npm run build -w backend`
# can resolve the workspace name from the workspaces declaration.
FROM base AS build
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./backend/
RUN npm run build -w backend

# ---- Stage 4: Runner (production image) ----
# Minimal runtime image. Contains only:
#   - Production npm dependencies
#   - Compiled TypeScript output (backend/dist/)
#   - Prisma schema + migrations (for prisma migrate deploy at startup)
#   - Prisma Client (regenerated for runtime platform)
# Runs as a non-root user for security.
FROM base AS runner

# Create non-root user for security best practices (no --system on alpine)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Install only production dependencies. The --omit=dev flag excludes
# devDependencies, reducing image size and attack surface.
# prisma CLI is in production dependencies so prisma migrate deploy
# and prisma generate work at runtime.
#
# All workspace package.json files are required so npm ci can resolve
# the workspace dependency tree from the lockfile.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY cron/package.json ./cron/
RUN npm ci --omit=dev

# Copy compiled TypeScript output from the build stage
COPY --from=build /app/backend/dist/ ./backend/dist/

# Copy Prisma schema and migration files.
# Required at runtime for: prisma migrate deploy, prisma generate
COPY --from=build /app/backend/prisma/ ./backend/prisma/

# Generate Prisma Client for the runtime platform architecture.
# This is regenerated in the runner stage (not copied from build) to
# ensure the platform-specific Prisma query engine binary matches the
# runtime CPU architecture. Without this, building on ARM (e.g. M1 Mac)
# and deploying on AMD64 (Fly.io) would have a binary mismatch.
RUN cd backend && npx prisma generate

# Clean up workspace metadata files not needed at runtime.
RUN rm -f package-lock.json

# Remove cache directories to reduce image size
RUN rm -rf /root/.npm /root/.npm-cache /tmp/*

# Switch to non-root user
USER appuser

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Health check: polls the Express health endpoint every 30 seconds.
# The health endpoint checks database connectivity and returns 200/503.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => process.exit(r.ok?0:1)).catch(() => process.exit(1))"

# Startup: run database migrations, then start the Express server.
# prisma migrate deploy applies all pending migrations atomically.
# If no migrations exist yet, it exits successfully with no action.
CMD npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js
