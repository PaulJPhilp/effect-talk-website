# Project guidance (effect-talk-website)

Guidance for working in this repo. See also docs/env.md, docs/deployment.md, and .cursor/rules.

## Database safety — CRITICAL

**NEVER run `bun run db:push` or `bunx drizzle-kit push`.** These commands are interactive and will offer to DROP tables that exist in the database but are not in `schema-app.ts` — including `effect_patterns` and other tables owned by the Effect-Patterns project. Confirming the prompt **destroys production data irreversibly**.

The `drizzle.config.ts` only references `schema-app.ts`. Tables from the Effect-Patterns project (`effect_patterns`, `application_patterns`, `pattern_relations`, `skills`, `skill_patterns`) live in the same database but are NOT in that schema file. Drizzle treats them as "extra" and offers to delete them.

### Rules

1. **NEVER run `db:push` or `drizzle-kit push`** — not even "just to create one table". It WILL offer to drop external tables and a single confirmation destroys data.
2. **NEVER run `db:generate`** without the user explicitly requesting it — it is interactive and can produce destructive migrations.
3. **For new tables:** Write raw SQL via a script or add the CREATE TABLE to a migration file. Example:
   ```bash
   bun -e "..." # Execute CREATE TABLE SQL directly
   ```
4. **If the user asks you to run `db:push`:** Refuse and explain this rule. Link them to this section of CLAUDE.md.
5. **The shared database contains tables from multiple projects.** Never assume that all tables in the DB are defined in this project's schema files.

## Environment files

**The env files are set up correctly. Do not modify `.env`, `.env.example`, or `.env.local` unless the user explicitly asks to add a new variable or rotate a secret.**

Follow the conventions in **docs/env.md**. Summary:

### File roles

- **`.env`** — Committed. Safe defaults and placeholders only. **Never add real secrets.**
- **`.env.example`** — Committed. Template; same keys and order as `.env`. Copy to `.env.local` and replace placeholders.
- **`.env.local`** — Gitignored. Real secrets. **Never commit.**

### Rules

1. **Do not put real secrets in `.env`** — Only safe defaults (e.g. `WORKOS_COOKIE_PASSWORD=xxx`, `API_KEY_PEPPER=change-me-in-production`).
2. **Do not commit `.env.local`** — It is gitignored; never add it or suggest adding it to the repo.
3. **Keep `.env` and `.env.example` in sync** — When adding a new env var the app needs, add it to both files with the same key and a safe default or placeholder.
4. **Do not remove or reorder keys** in `.env` or `.env.example` without a clear reason; prefer adding new keys and leaving existing ones unchanged.
5. **WorkOS:** `WORKOS_COOKIE_PASSWORD` must be at least 32 characters when used for sign-in; document or generate with `openssl rand -base64 24` where relevant.
6. **CLI deploy:** The build reads `.env` and `.env.local` on the machine running the build; for sign-in and API keys to work in the deployed app, `.env.local` must have real values when running `vercel` or `vercel --prod`.

### When editing code

- Do not add code that reads env from files other than via `process.env` (Next.js and the app already load `.env` and `.env.local`).
- Do not suggest committing `.env.local` or putting production secrets in `.env`.
- When introducing a new environment variable, add it to both `.env` and `.env.example` with a safe default or placeholder, and update docs/env.md if it affects the rules or setup.
- **Leave env files alone** — Do not change them unless the user explicitly requests it.
