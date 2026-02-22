import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// Exception: @/db/client mock required — Drizzle lazy proxy accesses DATABASE_URL
// which is not available in unit tests.
// These stubs return valid shapes only; no call-verification assertions.
vi.mock("@/db/client", () => ({
  db: {
    execute: () => Promise.reject(new Error("no db in unit tests")),
  },
}))

// Exception: @/services/Auth mock required — Auth.Default requires next/headers
// which is not available outside a Next.js request context.
// These stubs return valid shapes only; no call-verification assertions.
vi.mock("@/services/Auth", () => ({
  isWorkOSConfigured: () => false,
}))

import { GET } from "@/app/api/health-check/route"

describe("GET /api/health-check", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.APP_ENV
    delete process.env.VERCEL_ENV
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS
  })

  afterEach(() => {
    process.env.APP_ENV = originalEnv.APP_ENV
    process.env.VERCEL_ENV = originalEnv.VERCEL_ENV
    process.env.NEXT_PUBLIC_POSTHOG_KEY = originalEnv.NEXT_PUBLIC_POSTHOG_KEY
    process.env.OTEL_EXPORTER_OTLP_HEADERS = originalEnv.OTEL_EXPORTER_OTLP_HEADERS
  })

  it("returns 200 with the expected response shape", async () => {
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        environment: expect.any(String),
        database: { connected: expect.any(Boolean) },
        posthog: { configured: expect.any(Boolean) },
        honeycomb: { configured: expect.any(Boolean) },
        workos: { configured: expect.any(Boolean) },
        timestamp: expect.any(String),
      }),
    )
  })

  it('reports environment as "local" by default', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.environment).toBe("local")
  })

  it("reports environment from APP_ENV", async () => {
    process.env.APP_ENV = "staging"
    const res = await GET()
    const body = await res.json()
    expect(body.environment).toBe("staging")
  })

  it("reports database.connected as false when db is unavailable", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.database.connected).toBe(false)
  })

  it("reports posthog as not configured when key is missing", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.posthog.configured).toBe(false)
  })

  it("reports posthog as configured when a real key is present", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_realkey123"
    const res = await GET()
    const body = await res.json()
    expect(body.posthog.configured).toBe(true)
  })

  it("reports posthog as not configured for placeholder key", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_placeholder"
    const res = await GET()
    const body = await res.json()
    expect(body.posthog.configured).toBe(false)
  })

  it("reports honeycomb as not configured when headers are missing", async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.honeycomb.configured).toBe(false)
  })

  it("reports honeycomb as configured when real headers are present", async () => {
    process.env.OTEL_EXPORTER_OTLP_HEADERS = "x-honeycomb-team=abc123"
    const res = await GET()
    const body = await res.json()
    expect(body.honeycomb.configured).toBe(true)
  })

  it("reports honeycomb as not configured for placeholder headers", async () => {
    process.env.OTEL_EXPORTER_OTLP_HEADERS = "x-honeycomb-team=your-api-key-here"
    const res = await GET()
    const body = await res.json()
    expect(body.honeycomb.configured).toBe(false)
  })

  it("returns a valid ISO timestamp", async () => {
    const res = await GET()
    const body = await res.json()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })
})
