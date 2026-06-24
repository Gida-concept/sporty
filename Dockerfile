# GameDayWire Backend -- Multi-stage Dockerfile for Fly.io
# Builds a minimal production image with:
#   - Compiled TypeScript (via tsc)
#   - Prisma Client (generated)
#   - Turso (libSQL) database connection (connection string from environment)
#   - Runtime path alias resolution (via tsconfig-paths)
#
# Database: Turso (libSQL). Set DATABASE_URL and TURSO_AUTH_TOKEN via Fly secrets:
#   fly secrets set DATABASE_URL="libsql://your-db.turso.io" TURSO_AUTH_TOKEN="your_token"
# See docs/turso-setup.md for setup instructions.

# ---- Base ----
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

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

# Copy production manifest and lockfile for a workspace-free install
COPY backend/package.json ./package.json
COPY pnpm-lock.yaml ./

# Install production dependencies only (no devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy compiled TypeScript output
COPY --from=build /app/backend/dist ./dist

# Copy Prisma schema and migrations (needed at runtime for Prisma Client)
COPY --from=build /app/backend/prisma ./prisma

# Generate Prisma Client for the runtime platform architecture
RUN npx prisma generate --schema=./prisma/schema.prisma

# tsconfig-paths resolves @/ path aliases at runtime via tsconfig.json.
# Map @/* to ./dist/* (the compiled output directory).
RUN echo '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["./dist/*"]},"esModuleInterop":true}}' > tsconfig.json

ENV NODE_ENV=production
ENV PORT=8080
# DATABASE_URL comes from the environment (set via Fly secrets for Turso).
# Do NOT hardcode a database path here.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]
