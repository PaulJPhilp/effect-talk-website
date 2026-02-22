/**
 * Unit tests for Auth crypto helpers.
 *
 * Pure functions — no Next.js or WorkOS imports needed.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  signSessionValue,
  verifySessionValue,
  getSessionSigningSecret,
  SESSION_TOKEN_SEPARATOR,
} from "@/services/Auth/crypto"

const SECRET = "a".repeat(32) // valid 32-char secret

describe("Auth crypto", () => {
  describe("signSessionValue + verifySessionValue round-trip", () => {
    it("verifies a correctly signed value", () => {
      const signed = signSessionValue("user_123", SECRET)
      expect(verifySessionValue(signed, SECRET)).toBe("user_123")
    })

    it("returns null for a different secret", () => {
      const signed = signSessionValue("user_123", SECRET)
      const otherSecret = "b".repeat(32)
      expect(verifySessionValue(signed, otherSecret)).toBeNull()
    })

    it("returns null for tampered value", () => {
      const signed = signSessionValue("user_123", SECRET)
      const tampered = signed.replace("user_123", "user_999")
      expect(verifySessionValue(tampered, SECRET)).toBeNull()
    })

    it("returns null for tampered signature", () => {
      const signed = signSessionValue("user_123", SECRET)
      const parts = signed.split(SESSION_TOKEN_SEPARATOR)
      const tampered = `${parts[0]}${SESSION_TOKEN_SEPARATOR}${parts[1]!.slice(0, -1)}X`
      expect(verifySessionValue(tampered, SECRET)).toBeNull()
    })

    it("handles values containing the separator character", () => {
      const value = "some.dotted.value"
      const signed = signSessionValue(value, SECRET)
      expect(verifySessionValue(signed, SECRET)).toBe(value)
    })

    it("handles empty string value", () => {
      const signed = signSessionValue("", SECRET)
      // separatorIndex would be 0, which is <= 0, so verify returns null
      expect(verifySessionValue(signed, SECRET)).toBeNull()
    })
  })

  describe("verifySessionValue edge cases", () => {
    it("returns null for string without separator", () => {
      expect(verifySessionValue("noseparator", SECRET)).toBeNull()
    })

    it("returns null for empty string", () => {
      expect(verifySessionValue("", SECRET)).toBeNull()
    })

    it("returns null when separator is at index 0", () => {
      expect(verifySessionValue(".something", SECRET)).toBeNull()
    })
  })

  describe("signSessionValue format", () => {
    it("produces value.signature format", () => {
      const signed = signSessionValue("user_123", SECRET)
      const parts = signed.split(SESSION_TOKEN_SEPARATOR)
      expect(parts[0]).toBe("user_123")
      expect(parts.length).toBeGreaterThanOrEqual(2)
      // signature is base64url
      expect(parts[parts.length - 1]).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })

  describe("getSessionSigningSecret", () => {
    const saved: Record<string, string | undefined> = {}

    beforeEach(() => {
      saved.SESSION_COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET
      saved.WORKOS_COOKIE_PASSWORD = process.env.WORKOS_COOKIE_PASSWORD
      delete process.env.SESSION_COOKIE_SECRET
      delete process.env.WORKOS_COOKIE_PASSWORD
    })

    afterEach(() => {
      if (saved.SESSION_COOKIE_SECRET !== undefined) {
        process.env.SESSION_COOKIE_SECRET = saved.SESSION_COOKIE_SECRET
      } else {
        delete process.env.SESSION_COOKIE_SECRET
      }
      if (saved.WORKOS_COOKIE_PASSWORD !== undefined) {
        process.env.WORKOS_COOKIE_PASSWORD = saved.WORKOS_COOKIE_PASSWORD
      } else {
        delete process.env.WORKOS_COOKIE_PASSWORD
      }
    })

    it("returns null when both env vars are missing", () => {
      expect(getSessionSigningSecret()).toBeNull()
    })

    it("returns null when secret is shorter than 32 chars", () => {
      process.env.SESSION_COOKIE_SECRET = "short"
      expect(getSessionSigningSecret()).toBeNull()
    })

    it("returns secret when exactly 32 chars", () => {
      const secret = "x".repeat(32)
      process.env.SESSION_COOKIE_SECRET = secret
      expect(getSessionSigningSecret()).toBe(secret)
    })

    it("prefers SESSION_COOKIE_SECRET over WORKOS_COOKIE_PASSWORD", () => {
      const primary = "a".repeat(32)
      const fallback = "b".repeat(32)
      process.env.SESSION_COOKIE_SECRET = primary
      process.env.WORKOS_COOKIE_PASSWORD = fallback
      expect(getSessionSigningSecret()).toBe(primary)
    })

    it("falls back to WORKOS_COOKIE_PASSWORD when SESSION_COOKIE_SECRET is missing", () => {
      const fallback = "c".repeat(32)
      process.env.WORKOS_COOKIE_PASSWORD = fallback
      expect(getSessionSigningSecret()).toBe(fallback)
    })

    it("returns null when WORKOS_COOKIE_PASSWORD is too short", () => {
      process.env.WORKOS_COOKIE_PASSWORD = "short"
      expect(getSessionSigningSecret()).toBeNull()
    })
  })
})
