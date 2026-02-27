# Architecture

Concise service-architecture guide for **effect-talk-website**. For the full system design (MRD), see [docs/system-architecture.md](./system-architecture.md).

---

## Project overview

**effect-talk-website** — Interactive learning platform for Effect-TS patterns.

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.8+ (strict mode) |
| Backend | Effect-TS services, PostgreSQL + Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Auth | WorkOS AuthKit |
| Package manager | Bun |
| Testing | Vitest (happy-dom) |
| Hosting | Vercel |

## Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test` | Run tests (watch mode) |
| `bun run test:run` | Run tests once |
| `bun run lint` | ESLint |
| `bun run env:check` | Verify env vars for deploy |
| `bun run db:check` | Verify DB connection + tables |

## Service architecture

All backend logic is organized into **9 services** using the Effect.Service class pattern.

### File layout per service

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

### Pattern

- **`api.ts`** — defines the `*Service` interface and convenience functions. Consumers import from here; they never touch `service.ts` directly.
- **`service.ts`** — contains the `Effect.Service` class and a `*NoOp` layer for testing.
- **Convenience functions** auto-provide `Default` so callers don't manage dependencies.
- **Auth is a special case** — convenience functions return `Promise` (via `Effect.runPromise`) for use in Next.js server components and middleware.
- **NoOp layers** — every service exports a `*NoOp` layer (e.g. `BookmarksNoOp`) returning stub data. Tests use these instead of mocks.

### The 9 services

Analytics, ApiKeys, Auth, BackendApi, Bookmarks, Db, Email, PostHog, TourProgress.

## Rules for agents

1. **Adding a service:** Follow the same file layout — `api.ts` for interface + convenience functions, `service.ts` for `Effect.Service` class + NoOp layer.
2. **Modifying a service:** Keep the interface/convenience-function split. Don't put the `Effect.Service` class in `api.ts` or convenience functions in `service.ts`.
3. **No mocks:** Use `*NoOp` layers in tests, never `vi.mock()` or `vi.fn()`.

## Further reading

- [docs/Rules.md](./Rules.md) — Coding rules (database safety, imports, type safety, testing, Effect patterns)
- [docs/system-architecture.md](./system-architecture.md) — Full system design / MRD
- [docs/TESTING_STRATEGY.md](./TESTING_STRATEGY.md) — Testing patterns and policy
- [docs/env.md](./env.md) — Environment variable setup
- [docs/deployment.md](./deployment.md) — Vercel deployment process
