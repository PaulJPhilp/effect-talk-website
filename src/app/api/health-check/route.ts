import { NextResponse } from "next/server"
import { getAppEnv } from "@/lib/env"
import { isWorkOSConfigured } from "@/services/Auth"

/**
 * GET /api/health-check — Reports environment, DB connectivity, and service config.
 *
 * No auth required. No sensitive data (keys/URLs) exposed — only booleans.
 */
export async function GET() {
  const environment = getAppEnv()
  const vercelEnv = process.env.VERCEL_ENV ?? null

  // Database: lightweight connectivity check
  let dbConnected = false
  try {
    const { db } = await import("@/db/client")
    const { sql } = await import("drizzle-orm")
    await (db as ReturnType<typeof import("drizzle-orm/neon-http").drizzle>).execute(sql`SELECT 1`)
    dbConnected = true
  } catch {
    // db not connected or DATABASE_URL missing
  }

  // PostHog: check key is present and non-placeholder
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""
  const posthogConfigured =
    posthogKey.length > 0 &&
    !posthogKey.includes("your-") &&
    posthogKey !== "phc_placeholder"

  // Honeycomb: check headers present and non-placeholder
  const otelHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS ?? ""
  const honeycombConfigured =
    otelHeaders.length > 0 && !otelHeaders.includes("your-api-key-here")

  // WorkOS: use existing helper
  const workosConfigured = isWorkOSConfigured()

  return NextResponse.json({
    environment,
    vercelEnv,
    database: { connected: dbConnected },
    posthog: { configured: posthogConfigured },
    honeycomb: { configured: honeycombConfigured },
    workos: { configured: workosConfigured },
    timestamp: new Date().toISOString(),
  })
}
