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
