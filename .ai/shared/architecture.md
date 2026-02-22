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
