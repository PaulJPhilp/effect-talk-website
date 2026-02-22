/**
 * Unit tests for Db service helpers.
 */

import { describe, it, expect } from "vitest"
import {
  toDbError,
  parseTagsJsonb,
  mapPattern,
  mapRule,
  mapUser,
  mapApiKey,
} from "@/services/Db/helpers"
import { DbError } from "@/services/Db/errors"
import type { patterns, rules, users, apiKeys } from "@/db/schema"

// ── Row factories ───────────────────────────────────────────────────

function makePatternRow(
  overrides: Partial<typeof patterns.$inferSelect> = {},
): typeof patterns.$inferSelect {
  return {
    id: "p1",
    slug: "test-pattern",
    title: "Test Pattern",
    summary: "A summary",
    skillLevel: "beginner",
    category: "error-handling",
    difficulty: "easy",
    tags: null,
    examples: [],
    useCases: [],
    rule: null,
    content: "Some content",
    author: "author",
    lessonOrder: null,
    applicationPatternId: null,
    validated: false,
    validatedAt: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-06-01T00:00:00Z"),
    releaseVersion: null,
    ...overrides,
  }
}

function makeRuleRow(
  overrides: Partial<typeof rules.$inferSelect> = {},
): typeof rules.$inferSelect {
  return {
    id: "r1",
    title: "Test Rule",
    description: "Rule desc",
    content: "Rule content",
    category: "best-practice",
    severity: "warning",
    tags: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-06-01T00:00:00Z"),
    ...overrides,
  }
}

function makeUserRow(
  overrides: Partial<typeof users.$inferSelect> = {},
): typeof users.$inferSelect {
  return {
    id: "u1",
    workosId: "workos_123",
    email: "user@example.com",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    preferences: {},
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-06-01T00:00:00Z"),
    ...overrides,
  }
}

function makeApiKeyRow(
  overrides: Partial<typeof apiKeys.$inferSelect> = {},
): typeof apiKeys.$inferSelect {
  return {
    id: "k1",
    userId: "u1",
    name: "My Key",
    keyPrefix: "ek_abc1234",
    keyHash: "deadbeef",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    revokedAt: null,
    ...overrides,
  }
}

describe("Db helpers", () => {
  // ── parseTagsJsonb ──────────────────────────────────────────────

  describe("parseTagsJsonb", () => {
    it("returns null for null input", () => {
      expect(parseTagsJsonb(null)).toBeNull()
    })

    it("returns null for undefined input", () => {
      expect(parseTagsJsonb(undefined)).toBeNull()
    })

    it("returns null for non-array input", () => {
      expect(parseTagsJsonb("not-an-array")).toBeNull()
      expect(parseTagsJsonb(42)).toBeNull()
      expect(parseTagsJsonb({})).toBeNull()
    })

    it("returns null for empty array", () => {
      expect(parseTagsJsonb([])).toBeNull()
    })

    it("returns string array for valid input", () => {
      expect(parseTagsJsonb(["a", "b"])).toEqual(["a", "b"])
    })

    it("filters out non-string elements", () => {
      expect(parseTagsJsonb(["a", 1, null, "b", true])).toEqual(["a", "b"])
    })

    it("returns null when all elements are non-string", () => {
      expect(parseTagsJsonb([1, null, true])).toBeNull()
    })
  })

  // ── mapPattern ──────────────────────────────────────────────────

  describe("mapPattern", () => {
    it("maps a basic pattern row", () => {
      const result = mapPattern(makePatternRow())
      expect(result).toEqual({
        id: "p1",
        title: "Test Pattern",
        description: "A summary",
        content: "Some content",
        category: "error-handling",
        difficulty: "easy",
        tags: null,
        new: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-06-01T00:00:00.000Z",
      })
    })

    it("coalesces null content to empty string", () => {
      const result = mapPattern(makePatternRow({ content: null }))
      expect(result.content).toBe("")
    })

    it("parses tags via parseTagsJsonb", () => {
      const result = mapPattern(makePatternRow({ tags: ["a", "b"] }))
      expect(result.tags).toEqual(["a", "b"])
    })

    it("marks pattern as new when releaseVersion >= cutoff", () => {
      const result = mapPattern(makePatternRow({ releaseVersion: "0.12.0" }))
      expect(result.new).toBe(true)
    })

    it("marks pattern as not new when releaseVersion < cutoff", () => {
      const result = mapPattern(makePatternRow({ releaseVersion: "0.11.0" }))
      expect(result.new).toBe(false)
    })

    it("marks pattern as not new when releaseVersion is null", () => {
      const result = mapPattern(makePatternRow({ releaseVersion: null }))
      expect(result.new).toBe(false)
    })
  })

  // ── mapRule ─────────────────────────────────────────────────────

  describe("mapRule", () => {
    it("maps a basic rule row", () => {
      const result = mapRule(makeRuleRow())
      expect(result).toEqual({
        id: "r1",
        title: "Test Rule",
        description: "Rule desc",
        content: "Rule content",
        category: "best-practice",
        severity: "warning",
        tags: null,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-06-01T00:00:00.000Z",
      })
    })

    it("passes through tags array", () => {
      const result = mapRule(makeRuleRow({ tags: ["x", "y"] as unknown as string[] }))
      expect(result.tags).toEqual(["x", "y"])
    })
  })

  // ── mapUser ─────────────────────────────────────────────────────

  describe("mapUser", () => {
    it("maps a full user row", () => {
      const result = mapUser(makeUserRow())
      expect(result).toEqual({
        id: "u1",
        workos_id: "workos_123",
        email: "user@example.com",
        name: "Test User",
        avatar_url: "https://example.com/avatar.png",
        preferences: {},
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-06-01T00:00:00.000Z",
      })
    })

    it("handles null name and avatar", () => {
      const result = mapUser(makeUserRow({ name: null, avatarUrl: null }))
      expect(result.name).toBeNull()
      expect(result.avatar_url).toBeNull()
    })

    it("casts preferences as Record<string, unknown>", () => {
      const prefs = { theme: "dark", fontSize: 14 }
      const result = mapUser(makeUserRow({ preferences: prefs }))
      expect(result.preferences).toEqual(prefs)
    })
  })

  // ── mapApiKey ───────────────────────────────────────────────────

  describe("mapApiKey", () => {
    it("maps an active API key row", () => {
      const result = mapApiKey(makeApiKeyRow())
      expect(result).toEqual({
        id: "k1",
        user_id: "u1",
        name: "My Key",
        key_prefix: "ek_abc1234",
        key_hash: "deadbeef",
        created_at: "2024-01-01T00:00:00.000Z",
        revoked_at: null,
      })
    })

    it("maps a revoked API key row", () => {
      const revokedAt = new Date("2024-03-01T00:00:00Z")
      const result = mapApiKey(makeApiKeyRow({ revokedAt }))
      expect(result.revoked_at).toBe("2024-03-01T00:00:00.000Z")
    })
  })

  // ── toDbError (existing) ────────────────────────────────────────

  describe("toDbError", () => {
    it("should convert Error to DbError", () => {
      const error = new Error("Database connection failed")
      const dbError = toDbError(error)

      expect(dbError).toBeInstanceOf(DbError)
      expect(dbError._tag).toBe("DbError")
      expect(dbError.message).toBe("Database connection failed")
      expect(dbError.cause).toBe(error)
    })

    it("should handle non-Error values", () => {
      const dbError = toDbError("string error")

      expect(dbError).toBeInstanceOf(DbError)
      expect(dbError._tag).toBe("DbError")
      expect(dbError.message).toBe("Database query failed")
      expect(dbError.cause).toBe("string error")
    })

    it("should handle null/undefined", () => {
      const dbError1 = toDbError(null)
      const dbError2 = toDbError(undefined)

      expect(dbError1.message).toBe("Database query failed")
      expect(dbError2.message).toBe("Database query failed")
    })
  })
})
