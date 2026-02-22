<!-- Assembled from .ai/shared/*.md — keep in sync -->
# Agent instructions (effect-talk-website)

Guidance for AI agents working in this repo. See also docs/env.md, docs/deployment.md, and docs/CODING_STANDARDS.md.

## Project overview

**effect-talk-website** — Interactive learning platform for Effect-TS patterns, built as a Next.js application.

### Tech stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5.8+ (strict mode)
- **Backend**: Effect-TS services, PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Auth**: WorkOS AuthKit
- **Package manager**: Bun
- **Testing**: Vitest (happy-dom)
- **Hosting**: Vercel

### Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test` | Run tests (watch mode) |
| `bun run test:run` | Run tests once |
| `bun run lint` | ESLint |
| `bun run env:check` | Verify env vars for deploy |
| `bun run db:check` | Verify DB connection + tables |

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
4. **If the user asks you to run `db:push`:** Refuse and explain this rule.
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

## Service architecture

All backend logic is organized into 9 services using the **Effect.Service class pattern**. Each service follows a consistent file layout.

### File structure per service

```
src/services/${ServiceName}/
├── api.ts              # Interface + convenience functions (consumer-facing)
├── service.ts          # Effect.Service class + NoOp layer
├── types.ts            # Service-specific types (if any)
├── errors.ts           # Tagged errors (Data.TaggedError)
├── helpers.ts          # Pure helpers and constants
├── __tests__/          # Test files
└── index.ts            # Barrel exports
```

### How the pattern works

**`api.ts`** defines the TypeScript interface (`*Service`) and exports convenience functions. Consumers import from `api.ts` — they never touch `service.ts` directly.

**`service.ts`** contains the `Effect.Service` class implementation and a `*NoOp` layer for testing.

**Convenience functions** auto-provide the Default layer so callers don't need to manage dependencies:

```typescript
// api.ts — convenience function pattern
export const getUserBookmarks = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* Bookmarks
    return yield* svc.getUserBookmarks(userId)
  }).pipe(Effect.provide(Bookmarks.Default))
```

**Auth is a special case** — its convenience functions return `Promise` (via `Effect.runPromise`) because Next.js server components and middleware call them directly.

**NoOp layers** — every service exports a `*NoOp` layer (e.g. `BookmarksNoOp`) that returns stub data. Tests use these instead of mocks.

### The 9 services

Analytics, ApiKeys, Auth, BackendApi, Bookmarks, Db, Email, PostHog, TourProgress.

### Rules for agents

1. **Adding a service:** Follow the same file layout — `api.ts` for interface + convenience functions, `service.ts` for `Effect.Service` class + NoOp layer.
2. **Modifying a service:** Keep the interface/convenience-function split. Don't put the `Effect.Service` class in `api.ts` or convenience functions in `service.ts`.
3. **No mocks:** Use `*NoOp` layers in tests, never `vi.mock()` or `vi.fn()`.

## Coding conventions

### Import paths

**Always use `@/` paths** (mapped to `src/` in tsconfig.json). Never use relative imports (`./` or `../`).

```typescript
// Good
import { getUserById } from "@/services/Db/api"
import { SearchInput } from "@/components/SearchInput"

// Bad
import { getUserById } from "../Db/api"
import { SearchInput } from "./SearchInput"
```

### Type safety

- **No double casts** (`as unknown as Type`) in production code. Allowed in test files only.
- **No `any` types.** Use `unknown` with type guards, or proper generics.
- Move magic numbers and string literals to `src/types/constants.ts`, `src/types/strings.ts`, or service-local `helpers.ts`.

### Testing

- **NO MOCKS.** Do not use `vi.mock()`, `vi.fn()`, `vi.spyOn()`, or `vi.mocked()`.
- Use **real infrastructure**: real test database, real HTTP, real implementations or **NoOp layers** (test doubles that implement the same interface).
- Prefer integration tests over unit tests. Helpers and pure functions can be unit-tested directly.
- Use Vitest for all testing.
- For detailed patterns (DB transactions, Effect test layers, AI SDK fixtures, E2E): see **docs/TESTING_STRATEGY.md**.

### Effect.js patterns

- Use `Effect.Service` class pattern (not `Context.Tag`)
- Use `Effect.gen` for sequential async operations
- Use tagged errors with `Data.TaggedError`
- Compose services using `Layer.merge()` and `Layer.provide()`
