import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { getAppEnv } from "@/lib/env"

describe("getAppEnv", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.APP_ENV
    delete process.env.VERCEL_ENV
  })

  afterEach(() => {
    process.env.APP_ENV = originalEnv.APP_ENV
    process.env.VERCEL_ENV = originalEnv.VERCEL_ENV
  })

  it('returns "local" when neither APP_ENV nor VERCEL_ENV is set', () => {
    expect(getAppEnv()).toBe("local")
  })

  it("returns APP_ENV when explicitly set to production", () => {
    process.env.APP_ENV = "production"
    expect(getAppEnv()).toBe("production")
  })

  it("returns APP_ENV when explicitly set to staging", () => {
    process.env.APP_ENV = "staging"
    expect(getAppEnv()).toBe("staging")
  })

  it("returns APP_ENV when explicitly set to local", () => {
    process.env.APP_ENV = "local"
    expect(getAppEnv()).toBe("local")
  })

  it("APP_ENV takes precedence over VERCEL_ENV", () => {
    process.env.APP_ENV = "staging"
    process.env.VERCEL_ENV = "production"
    expect(getAppEnv()).toBe("staging")
  })

  it('derives "production" from VERCEL_ENV=production when APP_ENV is unset', () => {
    process.env.VERCEL_ENV = "production"
    expect(getAppEnv()).toBe("production")
  })

  it('derives "staging" from VERCEL_ENV=preview when APP_ENV is unset', () => {
    process.env.VERCEL_ENV = "preview"
    expect(getAppEnv()).toBe("staging")
  })

  it('returns "local" for VERCEL_ENV=development when APP_ENV is unset', () => {
    process.env.VERCEL_ENV = "development"
    expect(getAppEnv()).toBe("local")
  })

  it('returns "local" for unrecognized APP_ENV values', () => {
    process.env.APP_ENV = "unknown"
    expect(getAppEnv()).toBe("local")
  })
})
