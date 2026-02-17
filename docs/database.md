# Database

## Schema source of truth

For the full schema (all columns, types, JSONB definitions, indexes, FKs, and migration history), see the Effect Pattern repo's `docs/DATABASE_ARCHITECTURE.md` (in that repo; e.g. `Effect-Patterns/docs/DATABASE_ARCHITECTURE.md` when checked out alongside this project).

The **Effect Pattern repo** (the project that owns `packages/toolkit` and the `effect_patterns` table) is the schema source of truth for the shared database. All changes to `effect_patterns` and related tables are defined and migrated there.

This app (**effect-talk-website**) only **reads** from the shared database. It does not run migrations that create or alter `effect_patterns`. The Drizzle definition in `src/db/schema.ts` exists so we can query the table; it must stay in sync with the source of truth when the other repo changes the schema.

## Configuration

- **DATABASE_URL** must point at the same database the Effect Pattern repo uses (the one where `effect_patterns` exists with the expected columns, including `release_version`).
- If the patterns page shows "0 patterns", verify that `DATABASE_URL` is correct and that the database has the `effect_patterns` table with a `release_version` column.

### Production (Neon + Vercel)

When deployed on Vercel with `APP_ENV=production` or `APP_ENV=staging`, the app uses Neon's serverless driver (`@neondatabase/serverless`) instead of node-postgres. This avoids connection pool exhaustion in serverless. Set `DATABASE_URL` to your Neon connection string in Vercel environment variables. See `.env.example` for the full production env var list.

## App-owned tables

App-owned tables (e.g. `feedback`, `users`, `api_keys`) are defined in this repo in `src/db/schema-app.ts` and migrated here. For the feedback table, a one-off apply is available: `bun run db:apply-feedback` (uses `drizzle/0004_feedback.sql`).

## Keeping the schema in sync

When the Effect Pattern repo adds or changes columns on `effect_patterns`, update the Drizzle definition in `src/db/schema.ts` in this repo to match (same table name, same column names and types). Do not add migrations in this repo that create or alter `effect_patterns`; migrations for that table live only in the Effect Pattern repo.
