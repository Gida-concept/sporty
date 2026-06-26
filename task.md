# Task: GameDayWire

## Build Order Overview

| Phase   | What                                                                         | Est. Files | Est. Tasks |
| ------- | ---------------------------------------------------------------------------- | ---------- | ---------- |
| **0 ✅**  | Root monorepo setup (npm, tsconfig, git, env, eslint, prettier)             | 8 config   | 1          |
| **1 ✅**  | Frontend foundation — Next.js, Tailwind, layout, UI primitives, static pages | 15+ files  | 2-3        |
| **2 ✅**  | Frontend pages — article detail, category, tag, SEO pages, dynamic routes    | 15+ files  | 2-3        |
| **3 ✅**  | Frontend API client library (mock-data-based initially)                      | 5 files    | 1          |
| **4 ✅**  | Backend foundation — Express app, middleware, config, health endpoint        | 10+ files  | 1-2        |
| **5 ✅**  | Database — Prisma schema (10 models), migrations, seed script                | 4 files    | 1          |
| **6 ✅**  | External API clients — SerpAPI, GroqAPI                   | 2 files    | 1          |
| **7 ✅**  | Backend core services (8 services — TrendFinder → Publisher)                 | 9+ files   | 2-3        |
| **8 ✅**  | Backend SEO & support services (10 services)                                 | 10 files   | 1          |
| **9 ✅**  | Backend admin services (4 services)                                          | 4 files    | 1          |
| **10 ✅** | Backend public API routes (9 endpoints)                                      | 9 files    | 1-2        |
| **11 ✅** | Backend admin API routes (13 endpoints)                                      | 7 files    | 1          |
| **12 ✅** | Connect frontend to real backend, remove mocks                               | 3 files    | 1          |
| **13 ✅** | Admin frontend — auth, dashboard, CRUD pages, components                     | 15+ files  | 2-3        |
| **14 ✅** | Cron jobs (9 scheduled tasks)                                                | 9 files    | 1-2        |
| **15 ⬜** | Tests — backend unit + integration, frontend, e2e                            | 20+ files  | 2-3        |
| **16 ✅** | Docker + deployment — Backend Docker image for Fly.io                        | 4 files    | 1          |

---

## Phase 16: Dockerize Backend for Fly.io Deployment ✅

**Goal:** Create production-grade Docker configuration for the Express.js backend, designed to deploy on Fly.io.

### Design

The Docker configuration lives in `backend/` and is designed for Fly.io. Key architectural decisions:

1. **Multi-stage Docker build** with `node:20-alpine` — minimal image, best security posture
2. **Build context** = monorepo root (needed for npm workspace resolution of `package-lock.json`)
3. **Three stages**: `deps` (install), `build` (prisma generate + tsc), `runner` (production minimal)
4. **Non-root user** in production image
5. **Prisma client regenerated** in runner stage for correct platform architecture
6. **`fly.toml`** documents `--config backend/fly.toml` usage from monorepo root

### Files Created

| File | Description |
|------|-------------|
| `backend/Dockerfile` | Multi-stage production Dockerfile (alpine, non-root, healthcheck) |
| `backend/.dockerignore` | Exclude node_modules, tests, .git, coverage, etc. |
| `backend/fly.toml` | Fly.io app config with health checks, scaling, build settings |
| `backend/Dockerfile.dev` | Dev mode with hot reload via tsx watch |

### Files Modified

| File | Description |
|------|-------------|
| `docs/deployment.md` | Replaced apply.build section with Fly.io deployment guide (section 3) |
| `.env.example` | Updated apply.build reference to Fly.io |

### Files Deleted (Cleanup)

| File | Description |
|------|-------------|
| `Dockerfile` | Root legacy Dockerfile removed (only `backend/Dockerfile` is authoritative) |
| `.dockerignore` | Root dockerignore removed (only `backend/.dockerignore` is authoritative) |

---

## Completed — 2026-06-26 — Backend Dockerization for Fly.io (Cleaned)

### What Was Done
Created 4 Docker configuration files in `backend/`. Fixed the `backend/Dockerfile` build stage to correctly copy `backend/` into `/app/backend/` (was incorrectly copying into `/app/` root, breaking workspace resolution). Deleted root `Dockerfile` and root `.dockerignore` so all Docker configuration lives exclusively in `backend/`.

### Files Created (in backend/)
- `C:\Users\USCHIP\Desktop\sporty\backend\Dockerfile` — Multi-stage production Dockerfile (4 stages: base, deps, build, runner)
- `C:\Users\USCHIP\Desktop\sporty\backend\.dockerignore` — Docker build context exclusions
- `C:\Users\USCHIP\Desktop\sporty\backend\fly.toml` — Fly.io app configuration with health checks, scaling, secrets management
- `C:\Users\USCHIP\Desktop\sporty\backend\Dockerfile.dev` — Dev mode with tsx watch hot reload

### Files Deleted
- `C:\Users\USCHIP\Desktop\sporty\Dockerfile` — Root legacy Dockerfile (superseded by backend/Dockerfile)
- `C:\Users\USCHIP\Desktop\sporty\.dockerignore` — Root dockerignore (superseded by backend/.dockerignore; Docker reads .dockerignore from build context root, so copy or symlink backend/.dockerignore if needed)

### Files Modified
- `C:\Users\USCHIP\Desktop\sporty\backend\Dockerfile` — Fixed `COPY backend/ .` to `COPY backend/ ./backend/` so source files land in `/app/backend/` where npm workspace expects them
- `C:\Users\USCHIP\Desktop\sporty\backend\.dockerignore` — Updated header to remove instructions about copying to monorepo root
- `C:\Users\USCHIP\Desktop\sporty\docs\deployment.md` — Replaced section 3 (apply.build) with Fly.io deployment guide; updated section 4 to reference `backend/Dockerfile`; cleaned up all apply.build references; removed "mirror at project root" language
- `C:\Users\USCHIP\Desktop\sporty\.env.example` — Updated apply.build reference to Fly.io

### Key Design Decisions

**Dockerfile architecture:**
- `node:20-alpine` base (~125MB) with OpenSSL for Prisma TLS connections
- Layer caching: dependency manifests copied before source code for maximum cache reuse
- Prisma client regenerated in runner stage to ensure correct CPU architecture binary (ARM Mac build -> AMD64 Fly.io deploy)
- Non-root `appuser` (UID 1001) in production for security hardening
- HEALTHCHECK polling `/api/health` every 30 seconds
- npm `--workspace` for workspace-scoped installs
- npm `-w backend` to install only backend workspace dependencies
- Build stage uses `COPY backend/ ./backend/` (not `COPY backend/ .`) so source files land in `/app/backend/` matching workspace layout

**Build context requirement:**
- Must be the monorepo root so npm can resolve `package-lock.json` and root `package.json`
- `fly deploy --config backend/fly.toml` from the monorepo root sets the context correctly
- Docker reads `.dockerignore` from build context root; copy `backend/.dockerignore` to project root if build context exclusions are needed

**Fly.io configuration:**
- Internal port 8080 (matches Dockerfile EXPOSE)
- HTTP -> HTTPS redirect enabled
- Min 1 machine, max 2 machines under load
- Health check at `/api/health` with 30s interval, 10s timeout, 15s grace period
- 512MB shared CPU VM (cost-effective for blog backend)
- Instructions for `fly secrets set` for all sensitive env vars

## Post-Completion Fix — 2026-06-26 — Dockerfile npm Workspace Resolution

### Problem
Fly.io builds were failing because the Dockerfile had bugs in npm workspace resolution:

1. **`deps` stage**: Only `backend/package.json` was copied before `npm ci`. The root `package.json` declares workspaces `["frontend", "backend", "cron"]`. npm ci requires ALL workspace `package.json` files to be present to validate the dependency tree against the lockfile. Without `frontend/package.json` and `cron/package.json`, npm ci would fail.

2. **`build` stage**: Missing the root `package.json` entirely. `npm run build -w backend` needs the root `package.json` to resolve the `-w backend` workspace name. Without it, npm cannot find the backend workspace and fails.

3. **`runner` stage**: Same missing workspace package.json issue as `deps` — `npm ci --omit=dev` would fail without all workspace manifests.

### Fix Applied
- **`backend/Dockerfile`**: Added `COPY frontend/package.json ./frontend/` and `COPY cron/package.json ./cron/` in both the `deps` and `runner` stages so `npm ci` can resolve the full workspace tree.
- **`backend/Dockerfile`**: Added `COPY --from=deps /app/package.json ./package.json` in the `build` stage so `npm run build -w backend` can resolve the backend workspace.
- **`backend/Dockerfile.dev`**: Added `COPY frontend/package.json ./frontend/` and `COPY cron/package.json ./cron/` before `npm install` for the same workspace resolution reason.

### Files Modified
- `C:\Users\USCHIP\Desktop\sporty\backend\Dockerfile` — Fixed 3 bugs: missing `frontend/package.json` + `cron/package.json` in deps stage, missing root `package.json` in build stage, missing `frontend/package.json` + `cron/package.json` in runner stage
- `C:\Users\USCHIP\Desktop\sporty\backend\Dockerfile.dev` — Added `frontend/package.json` + `cron/package.json` COPY before `npm install`

### Files Verified (No Changes Needed)
- `C:\Users\USCHIP\Desktop\sporty\backend\fly.toml` — Already correct: `dockerfile = "backend/Dockerfile"`, build context from monorepo root via `fly deploy --config backend/fly.toml`
- `C:\Users\USCHIP\Desktop\sporty\docs\deployment.md` — Section 3.4 describes the 4-stage build at a high level; still accurate after internal fixes
- `C:\Users\USCHIP\Desktop\sporty\package.json` — Root build script `npm run build -w backend && npm run build -w frontend` is for local dev only; Dockerfile uses `npm run build -w backend` directly

### Verification
- [x] Root `Dockerfile` deleted
- [x] Root `.dockerignore` deleted
- [x] `backend/Dockerfile` — Workspace package.json files copied in all stages, root package.json present in build stage, 4-stage build intact
- [x] `backend/.dockerignore` — Header updated, no root-copy instructions
- [x] `backend/fly.toml` — Correct Fly.io config with health checks, scaling, build settings
- [x] `backend/Dockerfile.dev` — Workspace package.json files copied before npm install
- [x] `docs/deployment.md` — Updated dockerignore reference, no root Dockerfile references
- [x] No remaining apply.build references in the codebase
- [x] No dangling imports or broken references

---

## Phase 16.5: Root fly.toml for Fly.io GitHub Integration ✅

**Goal:** Create a root `fly.toml` so Fly.io GitHub integration can find the backend config instead of auto-generating a stock Dockerfile.

### Problem
Fly.io GitHub integration looks for `fly.toml` at the **project root**. Our config only existed at `backend/fly.toml`, so Fly.io couldn't find it and auto-generated a stock 977-byte Dockerfile instead of using our custom 5,319-byte `backend/Dockerfile`.

### Fix Applied
- Created `C:\Users\USCHIP\Desktop\sporty\fly.toml` — a complete, self-contained Fly.io config that mirrors `backend/fly.toml` but uses `dockerfile = "backend/Dockerfile"` (relative to the monorepo root).

### Files Created
- `C:\Users\USCHIP\Desktop\sporty\fly.toml` — Root Fly.io config for GitHub integration

### Files Verified (No Changes Needed)
- `C:\Users\USCHIP\Desktop\sporty\backend\fly.toml` — Untouched; still works for local deploys with `fly deploy --config backend/fly.toml`
- `C:\Users\USCHIP\Desktop\sporty\backend\Dockerfile` — Still the custom multi-stage build
- `C:\Users\USCHIP\Desktop\sporty\backend\.dockerignore` — Verified it doesn't exclude `fly.toml` or any needed files; note that Docker reads `.dockerignore` from the build context root, so this file has no effect on actual builds (it's documentation only)
- Root `.dockerignore` — Confirmed deleted (not present); glob only finds `backend/.dockerignore`

### Key Design Decision
- The root `fly.toml` is a **complete config**, not a stub. Fly.io GitHub integration reads it directly and doesn't cascade to `backend/fly.toml`, so it must be self-sufficient.
- All settings match `backend/fly.toml`: app name `gamedaywire-api`, internal port `8080`, health check at `/api/health`, concurrency `50/25`, VM `512mb` shared CPU, `NODE_ENV=production`.
- Secrets are not duplicated or hardcoded — they remain in `fly secrets set`.
- `backend/fly.toml` is unchanged and remains the authoritative config for local `fly deploy --config backend/fly.toml` usage.

---

## Phase 16.6: Fix Fly.io Deploy — GitHub Actions Workflow

**Goal:** Stop Fly.io from using the auto-generated stock Dockerfile and deploy with our custom `backend/Dockerfile` via GitHub Actions CI.

### Root Cause Analysis

The Fly.io native GitHub integration (not a GitHub Actions workflow file) was handling deploys. When the repo was connected to Fly.io, its `fly launch` command created a separate remote branch `origin/flyio-new-files` (commit `c2f5f35` "New files from Fly.io Launch") with:

- **Root `fly.toml`** with `app = 'gamedaywire'` (NOT our app `gamedaywire-api`)
- **Root `Dockerfile`** — auto-generated 977-byte stock Dockerfile (`node:22.21.1-slim`)
- **Root `.dockerignore`** — auto-generated

The integration deployed to the auto-created `gamedaywire` app (not our `gamedaywire-api` app) using this auto-generated config, completely ignoring:
- Our root `fly.toml` with `app = "gamedaywire-api"` and `[build] dockerfile = "backend/Dockerfile"`
- Our custom 5,319-byte `backend/Dockerfile`

### Fix Applied

1. **Created `.github/workflows/deploy.yml`** — A proper GitHub Actions workflow that deploys using `flyctl deploy --remote-only --config backend/fly.toml` from the monorepo root. This explicitly uses our custom Dockerfile and targets the correct `gamedaywire-api` app. Requires `FLY_API_TOKEN` secret set in GitHub.

2. **Created root `.dockerignore`** — Docker reads `.dockerignore` from the build context root (the monorepo root for our setup), but no file existed there. The new root `.dockerignore` excludes `node_modules/`, `.git/`, build artifacts, env files, and other unnecessary data from the build context, reducing upload size and preventing accidental inclusion of secrets.

3. **Updated `docs/deployment.md`** — Added section 3.11 documenting the GitHub Actions workflow, prerequisites (deploy token setup), and instructions to disable Fly.io's native GitHub integration to avoid duplicate builds. Updated section 3.2 to reference root `fly.toml` and `.dockerignore`. Updated section 3.5 to mention the automatic CI deployment.

4. **Updated `backend/.dockerignore` header** — Changed from claiming it's the active config to documenting it as a reference copy, pointing to the root `.dockerignore` as the actual file Docker reads.

### Files Created

| File | Description |
|------|-------------|
| `.github/workflows/deploy.yml` | GitHub Actions workflow for Fly.io deployment |
| `.dockerignore` | Docker build context exclusions at the project root |

### Files Modified

| File | Description |
|------|-------------|
| `docs/deployment.md` | Added section 3.11 (CI/CD workflow), updated sections 3.2, 3.5 |
| `backend/.dockerignore` | Updated header to reference root `.dockerignore` as the authoritative config |

### User Action Required

Before the GitHub Actions workflow will work:

1. Generate a Fly.io deploy token:
   ```bash
   fly tokens create deploy -a gamedaywire-api
   ```

2. Add `FLY_API_TOKEN` as a GitHub repository secret (Settings -> Secrets and variables -> Actions)

3. **Disable Fly.io's native GitHub integration** in the Fly.io dashboard (app -> Deploy section) to avoid duplicate conflicting builds

4. Commit and push:
   ```bash
   git add .github/workflows/deploy.yml .dockerignore docs/deployment.md backend/.dockerignore
   git commit -m "Add GitHub Actions workflow for Fly.io deploy with custom Dockerfile"
   git push origin main
   ```

### Verification

- [x] `.github/workflows/deploy.yml` created with proper Fly.io deployment workflow
- [x] Root `.dockerignore` created to exclude unnecessary files from build context
- [x] `docs/deployment.md` updated with CI/CD documentation and setup instructions
- [x] `backend/.dockerignore` header updated to reference root `.dockerignore`
- [x] No dangling imports or broken references in any modified file
- [x] All new files follow project conventions and documentation standards

