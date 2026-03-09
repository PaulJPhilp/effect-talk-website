# EffectTalk Website

EffectTalk is a Next.js 16 application for Effect.ts patterns, rules, the interactive tour, CLI/MCP documentation, consulting, and authenticated API-key management.

## What is in the app

- Public patterns and rules browsing
- Public blog
- Interactive Effect Tour
- CLI and MCP documentation
- Coming-soon pages for Playground and Code Review with waitlist forms
- Feedback and consulting forms
- WorkOS AuthKit sign-in
- Settings and API key management for signed-in users

## Core commands

| Command | Description |
|---|---|
| `bun run dev` | Start the local dev server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript check (`tsc --noEmit`) |
| `bun run test:run` | Run all tests once |
| `bun run test:coverage` | Run tests with coverage thresholds |
| `bun run env:check` | Validate deploy-critical environment variables |
| `bun run db:check` | Verify DB connectivity and required tables |
| `bun run perf:tour` | Run the tour baseline script |

## Local setup

1. Install dependencies:
   ```bash
   bun install
   ```
2. Copy envs:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in real values in `.env.local`, especially:
   - `DATABASE_URL`
   - `WORKOS_API_KEY`
   - `WORKOS_CLIENT_ID`
   - `WORKOS_REDIRECT_URI`
   - `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
   - `WORKOS_COOKIE_PASSWORD`
   - `API_KEY_PEPPER`
4. Add `http://localhost:3000/auth/callback` to WorkOS Redirects.
5. Start the app:
   ```bash
   bun run dev
   ```

## Database safety

Do **not** run `bun run db:push` or `drizzle-kit push` against this project. The database is shared with Effect Patterns, and Drizzle can propose destructive drops for tables this repo does not own.

Use these docs instead:

- [docs/Rules.md](docs/Rules.md)
- [docs/database.md](docs/database.md)

## Testing

- `bun run test:run` currently passes across the full suite.
- `bun run test:coverage` currently passes the repo thresholds.
- Integration DB tests are gated behind `RUN_INTEGRATION_TESTS=1` and should only target a dedicated non-production database.

See:

- [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)
- [docs/testing.md](docs/testing.md)

## Documentation map

- [docs/Architecture.md](docs/Architecture.md) — current architecture and commands
- [docs/Rules.md](docs/Rules.md) — repo guardrails
- [docs/env.md](docs/env.md) — env-file and deploy-env guidance
- [docs/deployment.md](docs/deployment.md) — deploy checklist
- [docs/environments.md](docs/environments.md) — local/staging/production setup
- [docs/database.md](docs/database.md) — DB ownership and safety
- [docs/tour-performance.md](docs/tour-performance.md) — tour perf verification

Historical planning docs remain in `docs/`, but the files above are the current operational source of truth.
