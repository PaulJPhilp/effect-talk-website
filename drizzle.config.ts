import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(rootDir, ".env.local") })

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema-app.ts",
  out: "./drizzle",
  strict: false,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
})
