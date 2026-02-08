/**
 * Drizzle ORM database client.
 *
 * Uses node-postgres (pg) as the underlying driver with Drizzle's
 * type-safe query builder on top.
 */

import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/db/schema"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL")
}

export const db = drizzle(databaseUrl, { schema })
