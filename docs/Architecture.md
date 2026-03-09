# Architecture

Current architecture guide for **effect-talk-website**.

## Project overview

EffectTalk is a Next.js App Router application for:

- public Effect.ts patterns and rules
- the interactive Effect Tour
- CLI and MCP documentation
- waitlist, consulting, and feedback flows
- authenticated settings and API-key management

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript 5.9+ |
| Backend structure | Effect services |
| Database | PostgreSQL + Drizzle ORM |
| Styling | Tailwind CSS v4 |
| Auth | WorkOS AuthKit |
| Client state | Effect Atom where useful |
| Testing | Vitest + happy-dom |
| Hosting | Vercel |

## Current routes

Key route groups in the app today:

- Public content: `/`, `/patterns`, `/rules`, `/blog`, `/search`
- Docs/tools: `/cli`, `/mcp`, `/tour`
- Coming soon: `/playground`, `/code-review`
- Forms/pages: `/consulting`, `/feedback`, `/thanks`
- Auth/settings: `/auth/*`, `/settings`, `/settings/api-keys`
- App APIs: `/api/waitlist`, `/api/consulting`, `/api/feedback`, `/api/events`, `/api/profile`, `/api/preferences`, `/api/api-keys`, `/api/bookmarks`, `/api/tour/progress`

## Commands

| Command | Description |
|---|---|
| `bun run dev` | Start the local dev server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript check |
| `bun run test` | Run Vitest in watch mode |
| `bun run test:run` | Run all tests once |
| `bun run test:coverage` | Run tests with coverage thresholds |
| `bun run env:check` | Validate deploy-critical env vars |
| `bun run db:check` | Verify DB connectivity and required tables |
| `bun run perf:tour` | Run the tour baseline script |

Tour v4 content workflow:
- Generate the migrated snippet artifact in `effect-refactoring-tool` with `bun run --filter effect-v4-migration migrate-tour -- --seed /abs/path/to/effect-talk-website/scripts/seed-tour.ts --output /abs/path/to/tour-v4-snippets.json`
- Seed the website staging tables with `TOUR_V4_ARTIFACT_PATH=/abs/path/to/tour-v4-snippets.json bun run db:seed:tour`
- Promote with `bun run db:promote tour`

## Service architecture

Backend logic is organized into Effect services under `src/services`.

```
src/services/${ServiceName}/
├── api.ts
├── service.ts
├── types.ts
├── errors.ts
├── helpers.ts
├── __tests__/
└── index.ts
```

Current services:

- Analytics
- ApiKeys
- Auth
- BackendApi
- Bookmarks
- Db
- Email
- PostHog
- TourProgress

## Service conventions

- `api.ts` exports the interface and convenience functions.
- `service.ts` owns the `Effect.Service` implementation and test layer.
- Auth convenience functions intentionally return `Promise` for use in Next.js server components and middleware.
- Prefer `Effect.gen`, tagged errors, and `Layer.provide`.

## UI structure

- `src/app/layout.tsx` provides the global shell, theme provider, PostHog provider, header, footer, and toaster.
- `src/components/TabsBar.tsx` is the body-level product navigation for CLI, MCP, Tour, Playground, and Code Review.
- Tour mode access is now enforced server-side: `v4` and `v3 ↔ v4` require login.

## Current source of truth

Use these docs for current behavior:

- [docs/Rules.md](./Rules.md)
- [docs/database.md](./database.md)
- [docs/env.md](./env.md)
- [docs/deployment.md](./deployment.md)
- [docs/TESTING_STRATEGY.md](./TESTING_STRATEGY.md)

Historical planning docs still exist in `docs/`, but they are reference material, not the operational source of truth.
