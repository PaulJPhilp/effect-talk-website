import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/dist/",
        "**/.next/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "./src"),
    },
  },
})
