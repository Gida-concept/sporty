# =============================================================================
# GameDayWire Backend — Multi-stage Dockerfile for Fly.io
# =============================================================================
# Builds a minimal production image with:
#   - Compiled TypeScript (via tsc)
#   - Prisma Client (generated for runtime platform)
#   - Supabase PostgreSQL connection (connection string from environment secrets)
#
# BUILD CONTEXT: The monorepo ROOT (sporty/), not the backend/ subdirectory.
# This is required for pnpm workspace resolution (pnpm-lock.yaml,
# pnpm-workspace.yaml, and root package.json must be present).
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
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache openssl && \
    corepack enable && \
    corepack prepare pnpm@9 --activate
WORKDIR /app

# ---- Stage 2: Dependencies ----
# Install ALL dependencies (including devDependencies) needed for
# Prisma Client generation and TypeScript compilation.
#
# Layer caching strategy: Because we only copy the lockfile and workspace
# metadata BEFORE the source code, Docker can cache this layer and only
# rebuild when dependencies change (not when source changes).
FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter backend

# ---- Stage 3: Build ----
# Generate Prisma Client and compile TypeScript.
# Both steps run inside the build stage so that dev dependencies
# (typescript, @types/*) are available without polluting the final image.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/ .
RUN pnpm --filter backend build

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

# Install only production dependencies. The --prod flag excludes
# devDependencies, reducing image size and attack surface.
# prisma CLI is in production dependencies so prisma migrate deploy
# and prisma generate work at runtime.
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter backend --prod

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
# pnpm-workspace.yaml and package.json were only needed for install.
RUN rm -f pnpm-workspace.yaml

# Remove cache directories to reduce image size
RUN rm -rf /root/.npm /root/.pnpm-store /tmp/*

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
