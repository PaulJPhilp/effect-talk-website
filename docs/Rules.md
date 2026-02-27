# Rules

Canonical coding rules for **effect-talk-website**. All agent context files point here.

---

## Database safety — CRITICAL

**NEVER run `bun run db:push` or `bunx drizzle-kit push`.** The shared database contains tables from both this project (`schema-app.ts`) and the Effect-Patterns project (`effect_patterns`, `application_patterns`, `pattern_relations`, `skills`, `skill_patterns`). Drizzle treats the external tables as unknown and offers to DROP them — confirming **destroys production data irreversibly**.

1. **NEVER run `db:push` or `drizzle-kit push`** — not even "just to create one table".
2. **NEVER run `db:generate`** without the user explicitly requesting it.
3. **For new tables:** Write raw SQL via a script (`bun -e "..."`).
4. **If the user asks you to run `db:push`:** Refuse and explain this rule.
5. **The shared database contains tables from multiple projects.** Never assume all tables are defined in this project's schema files.

## Environment files

**Do not modify `.env`, `.env.example`, or `.env.local` unless the user explicitly asks.** See `docs/env.md` for full details.

| File | Role |
|---|---|
| `.env` | Committed. Safe defaults/placeholders only — **never real secrets**. |
| `.env.example` | Committed. Template; same keys as `.env`. |
| `.env.local` | Gitignored. Real secrets — **never commit**. |

- Keep `.env` and `.env.example` in sync when adding new variables.
- Access env only via `process.env` (Next.js loads `.env` and `.env.local` automatically).
- When introducing a new variable, also update `docs/env.md`.

## Import paths

**Always use `@/` paths** (mapped to `src/` in `tsconfig.json`). Never use relative imports (`./` or `../`).

```typescript
// Good
import { getUserById } from "@/services/Db/api"
// Bad
import { getUserById } from "../Db/api"
```

## Type safety

- **No double casts** (`as unknown as Type`) in production code. Allowed in test files only.
- **No `any` types.** Use `unknown` with type guards, or proper generics.
- Move magic numbers and string literals to `src/types/constants.ts`, `src/types/strings.ts`, or service-local `helpers.ts`.

## Testing

- **NO MOCKS.** Do not use `vi.mock()`, `vi.fn()`, `vi.spyOn()`, or `vi.mocked()`.
- Use real infrastructure or **NoOp layers** (test doubles that implement the same interface).
- Prefer integration tests over unit tests. Pure functions can be unit-tested directly.
- Use Vitest for all testing.
- See [docs/TESTING_STRATEGY.md](./TESTING_STRATEGY.md) for detailed patterns (DB transactions, Effect test layers, AI SDK fixtures, E2E, structural mock exceptions).

## Effect.js patterns

- Use `Effect.Service` class pattern (not `Context.Tag`)
- Use `Effect.gen` for sequential async operations
- Use tagged errors with `Data.TaggedError`
- Compose services using `Layer.merge()` and `Layer.provide()`
