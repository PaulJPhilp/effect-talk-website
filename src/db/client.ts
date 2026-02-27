/**
 * Drizzle ORM database client. Lazy-initialized so build never fails on missing DATABASE_URL.
 * Throws only on first use if DATABASE_URL is not set.
 *
 * - Production/staging: Neon serverless driver (HTTP) for connection-efficient
 *   serverless execution on Vercel.
 * - Local: node-postgres (pg) for development with Docker Postgres.
 */

import { neon } from "@neondatabase/serverless"
import * as schema from "@/db/schema"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { getAppEnv } from "@/lib/env"

type DbInstance = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>

let _db: DbInstance | null = null

function getDb(): DbInstance {
  if (_db) return _db
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || databaseUrl === "") {
    throw new Error(
      "DATABASE_URL is not set. Set it in Vercel (Build + Runtime) or in .env.local. See docs/deployment.md."
    )
  }
  const appEnv = getAppEnv()
  const useNeon = appEnv === "production" || appEnv === "staging"
  _db = useNeon
    ? drizzleNeon(neon(databaseUrl), { schema })
    : drizzlePg(databaseUrl, { schema })
  return _db
}

export const db = new Proxy({} as DbInstance, {
  get(_, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})
