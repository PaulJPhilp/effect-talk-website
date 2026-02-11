/**
 * Drizzle ORM schema definitions.
 *
 * - schema-app.ts: Tables we own (users, rules, tour, etc.). Pushed via db:push.
 * - schema-patterns.ts: effect_patterns — READ ONLY, owned by Effect Pattern repo.
 *
 * Use `drizzle-kit push` to sync app tables (effect_patterns is excluded).
 * Use `drizzle-kit generate` for migrations from schema-app.ts.
 *
 * ## Blue-Green Table Swap Strategy
 *
 * Content tables (rules, tour_lessons, tour_steps) use a blue-green deployment pattern.
 * Each has a `_staging` counterpart. effect_patterns has no staging in the shared DB.
 *
 * Workflow:
 *  1. Seed scripts write to `_staging` tables
 *  2. Validate the staging data
 *  3. Atomic swap: rename live → retired, staging → live
 *  4. Drop retired table when confident
 *
 * The `content_deployments` table provides an audit trail of every swap.
 */

export * from "@/db/schema-app"
export * from "@/db/schema-patterns"
