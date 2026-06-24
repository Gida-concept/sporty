# Turso (libSQL) Database Setup

GameDayWire uses **Turso** as its production database provider. Turso is a distributed SQLite-compatible database built on libSQL. It provides the same developer experience as SQLite with the scalability of a cloud service.

## Architecture Overview

```text
Prisma Client (driverAdapters)
       |
@prisma/adapter-libsql
       |
@libsql/client
       |
   Turso (libSQL)
   /           \
Local SQLite  Turso Platform
(file:)       (libsql://)
```

- **Local development:** `@libsql/client` connects to a local SQLite file (`file:./prisma/dev.db`)
- **Production:** `@libsql/client` connects to Turso's distributed database (`libsql://your-db.turso.io`)
- The Prisma schema uses `provider = "sqlite"` because Turso is SQLite-compatible
- The `driverAdapters` preview feature enables the runtime bridge between Prisma and libSQL

## Prerequisites

- [Turso CLI](https://docs.turso.tech/cli/installation) installed
- [Turso account](https://turso.tech) (free tier available)

## 1. Install Turso CLI

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (via npm)
npm install -g turso

# Verify
turso --version
```

## 2. Sign In and Create a Database

```bash
# Sign in (opens browser for OAuth)
turso auth login

# Create a database
turso db create gamedaywire

# List databases
turso db list

# Show database details (get the connection URL)
turso db show gamedaywire
```

The connection URL will look like:
```
libsql://gamedaywire-username.turso.io
```

## 3. Generate an Auth Token

```bash
# Create an authentication token for the database
turso db tokens create gamedaywire

# Output: a long token string — save this securely
```

## 4. Configure Local Environment

Add to your `backend/.env` file:

```env
# Local development (SQLite file via libSQL client)
DATABASE_URL="file:./prisma/dev.db"

# Production (Turso remote — only when running against Turso):
# DATABASE_URL="libsql://gamedaywire-username.turso.io"
# TURSO_AUTH_TOKEN="your_generated_token"
```

For local development, leave `DATABASE_URL` pointing to the local file. The `@libsql/client` library handles both local and remote connections transparently.

## 5. Run Database Migrations

```bash
# Local development — migrate local SQLite file
cd backend
npx prisma migrate dev --name init

# Production — push schema to Turso
# First set the Turso connection string:
export DATABASE_URL="libsql://gamedaywire-username.turso.io"
export TURSO_AUTH_TOKEN="your_token"

# Then push (migrate deploy also works if you set up migrations)
npx prisma db push
```

**Important:** `prisma migrate dev` only works with local SQLite. For Turso, use `prisma db push` to sync the schema, or run migrations against the local file first and then use `prisma migrate deploy` against Turso.

## 6. Verify the Connection

Start the backend and check that it connects successfully:

```bash
pnpm --filter backend dev
```

The Prisma client will use the `PrismaLibSQL` adapter to connect. No SQLite-specific PRAGMA configuration is needed (the adapter handles it).

## Fly.io Deployment

Set the Turso connection details as Fly secrets:

```bash
fly secrets set \
  DATABASE_URL="libsql://gamedaywire-username.turso.io" \
  TURSO_AUTH_TOKEN="your_generated_token"
```

The `fly.toml` should NOT contain these values — they are set as secrets for security.

### Verifying on Fly.io

```bash
# Check that the secrets are set
fly secrets list

# Deploy
fly deploy

# Check logs for database connection
fly logs
```

## Local Development with Local SQLite

The `@libsql/client` library supports `file:` protocol URLs, allowing you to use a local SQLite file for development without any cloud dependency:

```env
DATABASE_URL="file:./prisma/dev.db"
# No TURSO_AUTH_TOKEN needed for local development
```

This means:
- Local dev: works offline with a standard SQLite file
- Production: connects to Turso's distributed database
- Same code, same adapter — just different `DATABASE_URL`

## Switching Between Local and Turso

```bash
# Local development (SQLite file)
export DATABASE_URL="file:./prisma/dev.db"

# Turso remote
export DATABASE_URL="libsql://gamedaywire-username.turso.io"
export TURSO_AUTH_TOKEN="your_token"

# Run migrations against whichever database DATABASE_URL points to
npx prisma db push
```

## Troubleshooting

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| `Invalid URL` error | `DATABASE_URL` format is wrong | Ensure it starts with `libsql://` for Turso or `file:` for local |
| `Authentication required` | Missing or invalid `TURSO_AUTH_TOKEN` | Generate a new token with `turso db tokens create` |
| `Connection refused` | Database name is wrong | Check with `turso db list` |
| Prisma migration fails | Trying `migrate dev` against Turso | Use `prisma db push` instead for Turso |
| `table not found` | Schema not pushed to Turso | Run `prisma db push` against the Turso database URL |

## Useful Turso Commands

```bash
# List databases
turso db list

# Show database info
turso db show <db-name>

# Open a SQL shell to the database
turso db shell <db-name>

# Create a new auth token
turso db tokens create <db-name>

# Revoke all tokens
turso db tokens revoke <db-name>

# Delete a database (irreversible!)
turso db destroy <db-name>
```

## Resources

- [Turso Documentation](https://docs.turso.tech)
- [Turso Prisma Integration](https://docs.turso.tech/integrations/prisma)
- [libSQL Client GitHub](https://github.com/tursodatabase/libsql-client-ts)
- [@prisma/adapter-libsql](https://www.npmjs.com/package/@prisma/adapter-libsql)
