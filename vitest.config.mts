import { config } from "dotenv"
import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

// Load .env.local so DATABASE_URL and other vars are available for integration tests
config({ path: resolve(process.cwd(), ".env.local") })

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
      exclude: [
        // ── Infrastructure (no runtime logic) ─────────────────────
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/",
        "**/.next/",
        "**/errors.ts",
        "src/db/schema.ts",
        "src/db/schema-app.ts",
        "src/db/schema-patterns.ts",

        // ── Adapter exclusions ────────────────────────────────────
        // Each file below is an adapter/wiring module whose logic is
        // either (a) tested by gated integration tests, or (b) a thin
        // wrapper whose core logic has been extracted into a testable
        // helpers/crypto module. Adding a file here requires updating
        // docs/TESTING_STRATEGY.md § "Coverage Exclusions".
        //
        // service.ts — Effect.Service implementations calling external SDKs
        "src/services/Db/service.ts",          // Drizzle queries → integration.db.test.ts
        "src/services/Auth/service.ts",        // Next.js cookies + WorkOS SDK
        "src/services/Email/service.ts",       // Resend SDK; templates tested in helpers.ts
        "src/services/Analytics/service.ts",   // delegates to Db; error-swallowing by type
        "src/services/ApiKeys/service.ts",     // delegates to Db; token logic in helpers.ts
        //
        // api.ts — convenience wrappers: Effect.provide(*.Default)
        "src/services/Db/api.ts",
        "src/services/Analytics/api.ts",
        "src/services/ApiKeys/api.ts",
        "src/services/Auth/api.ts",
        "src/services/Email/api.ts",
        //
        // index.ts — barrel re-exports (no runtime logic)
        "src/services/Analytics/index.ts",
        "src/services/ApiKeys/index.ts",
        "src/services/Auth/index.ts",
        "src/services/BackendApi/index.ts",
        "src/services/Bookmarks/index.ts",
        "src/services/Db/index.ts",
        "src/services/Email/index.ts",
        "src/services/PostHog/index.ts",
        "src/services/TourProgress/index.ts",
        //
        // types.ts — pure type definitions (no runtime code)
        "src/services/Analytics/types.ts",
        "src/services/ApiKeys/types.ts",
        "src/services/BackendApi/types.ts",
        "src/services/Db/types.ts",
        "src/services/PostHog/types.ts",
        "src/services/TourProgress/types.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "./src"),
    },
  },
})
