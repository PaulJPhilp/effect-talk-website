<!-- AI agents: see also docs/Rules.md -->
# Testing Strategy

Current testing policy for **effect-talk-website**.

## Principles

- Test real behavior, not implementation trivia.
- Prefer observable state and rendered output over call-count assertions.
- Prefer pure-function tests and service-layer tests over brittle framework wiring tests.
- Integration tests that touch the database must use a dedicated non-production database.

## Current stack

| Layer | Tooling | Notes |
|---|---|---|
| Unit/component tests | Vitest + Testing Library | Runs in `happy-dom` |
| Route tests | Vitest | Uses `NextRequest` and narrow module stubs where needed |
| Integration DB tests | Vitest | Gated by `RUN_INTEGRATION_TESTS=1` |
| Coverage | Vitest v8 coverage | Thresholds enforced in `vitest.config.mts` |

## Commands

| Command | Purpose |
|---|---|
| `bun run test` | Watch mode |
| `bun run test:run` | Full suite |
| `bun run test:coverage` | Full suite with thresholds |
| `bun run test:integration` | DB-backed integration tests only |
| `bun run test:policy` | Guardrail checks for test policy |

## Mocking policy

Default rule: do not use broad mocking, spies, or call-verification-driven tests.

Preferred patterns:

- use real helpers and assert on return values
- use NoOp Effect layers for services
- use small fake `fetch` implementations that preserve the `fetch` type and assert on captured requests or resulting state
- use local test doubles for framework boundaries only when Next.js or SDK modules are not available in the test environment

Allowed exceptions:

- structural `vi.mock(...)` for framework-only boundaries such as `next/navigation`, `next/headers`, WorkOS helpers, or `@/db/client`
- local fake fetch implementations in test files or `src/test/*`

When using an exception, keep it narrow and assert on user-visible or state-visible outcomes.

## Database tests

- Never point `DATABASE_URL` at production.
- `src/services/__tests__/integration.db.test.ts` is intentionally skipped unless `RUN_INTEGRATION_TESTS=1`.
- Integration tests may truncate app-owned tables. Use a dedicated disposable database or branch.

## Coverage

Current thresholds from `vitest.config.mts`:

- statements: 85%
- branches: 75%
- functions: 85%
- lines: 85%

Coverage exclusions are intentional for infrastructure and thin adapters. If you add a new exclusion, update the rationale in `vitest.config.mts` and keep it narrow.

## Test organization

- Component tests live beside components in `src/components/__tests__`
- Route tests live beside routes in `src/app/**/__tests__`
- Hook tests live in `src/hooks/__tests__`
- Utility tests live in `src/lib/__tests__`
- Service tests live in `src/services/**/__tests__`

## Current expectations

Before merging substantial work, run at minimum:

1. `bun run lint`
2. `bun run typecheck`
3. `bun run test:run`

Use `bun run test:coverage` when changing uncovered code or when touching thresholds-sensitive areas such as routes, UI primitives, and auth flows.
