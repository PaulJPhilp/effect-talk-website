/**
 * Drizzle ORM database client.
 *
 * - Production/staging: Neon serverless driver (HTTP) for connection-efficient
 *   serverless execution on Vercel.
 * - Local: node-postgres (pg) for development with Docker Postgres.
 */

import { neon } from "@neondatabase/serverless"
import * as schema from "@/db/schema"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL")
}

const appEnv = (process.env.APP_ENV as "local" | "staging" | "production" | undefined) ?? "local"
const useNeon = appEnv === "production" || appEnv === "staging"

export const db = useNeon
  ? drizzleNeon(neon(databaseUrl), { schema })
  : drizzlePg(databaseUrl, { schema })
