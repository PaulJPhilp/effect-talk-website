# AGENTS.md

Project guidance for **effect-talk-website**.

## Architecture & rules

- [docs/Architecture.md](docs/Architecture.md) — Service architecture, tech stack, commands
- [docs/Rules.md](docs/Rules.md) — Database safety, imports, type safety, testing, Effect patterns

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

## Additional docs

- [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) — Testing patterns (no-mock, real infra)
- [docs/env.md](docs/env.md) — Environment variable setup
- [docs/deployment.md](docs/deployment.md) — Vercel deployment process

<!-- EP_RULES_START -->
<!-- EP_RULES_END -->
