<!-- AI agents: see also .ai/shared/conventions.md -->
# Coding Standards

This document defines coding standards and best practices for the EffectTalk website codebase.

## Type Safety

### Type Assertions

- **Production Code**: Double casts (`as unknown as Type`) are **forbidden** in production code. Use proper type guards, schema validation, or refactor to avoid the need for type assertions.

- **Test Code**: Double casts are allowed in test files only when necessary for type assertions (e.g. test fixtures). Do not use mocks (see Testing section).

### Avoiding `any` Types

- **Production Code**: Avoid `any` types. Use `unknown` and type guards, or proper generic types.
- **Test Code**: Avoid `any` types. Use proper types or typed test fixtures.

## Code Organization

### Services Structure

All services follow this structure:
```
src/services/${ServiceName}/
├── __tests__/          # Test files
├── api.ts              # Service interface + convenience functions
├── service.ts          # Effect.Service class + NoOp layer
├── errors.ts           # Service-specific errors
├── types.ts            # Service-specific types (if any)
├── helpers.ts          # Helper functions and constants
└── index.ts            # Barrel exports
```

- **`api.ts`** — Defines the `*Service` interface and exports convenience functions that auto-provide `Default`. Consumers import from here.
- **`service.ts`** — Contains the `Effect.Service` class implementation and a `*NoOp` layer (e.g. `BookmarksNoOp`) used in tests instead of mocks.

### Magic Numbers and String Literals

- All magic numbers and frequently used string literals should be moved to:
  - `src/types/constants.ts` for constants
  - `src/types/strings.ts` for string literal types
  - Service-specific `helpers.ts` for service-local constants

## Testing

- **NO MOCKS.** Do not use `vi.mock()`, `vi.fn()`, `vi.spyOn()`, `vi.mocked()`, or any mock return values. Mocks waste time and give false confidence; they don’t exercise real behavior.
- Use Vitest for all testing.
- Use **real infrastructure**: real test database (e.g. `DATABASE_URL` for a test Postgres), real HTTP (test server or real backend URL), real implementations or **test doubles** (e.g. an in-memory email sender that implements the same interface).
- Prefer integration tests: run code against a real DB, real HTTP server, or real services with test config.
- Helpers and pure functions can be unit-tested with no mocks. For everything else, use integration tests with real dependencies.

## Effect.js Patterns

- Use `Effect.Service` class pattern (not `Context.Tag`)
- Use `Effect.gen` for sequential async operations
- Use tagged errors with `Data.TaggedError`
- Compose services using `Layer.merge()` and `Layer.provide()`
