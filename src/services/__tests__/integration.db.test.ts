/**
 * Integration tests for Db, Analytics, and ApiKeys using the real database.
 * No mocks. Set RUN_INTEGRATION_TESTS=1 and DATABASE_URL to run against production.
 * Skipped when RUN_INTEGRATION_TESTS is not set (avoids loading DB client).
 * When RUN_INTEGRATION_TESTS=1 but DB is unreachable, tests are skipped with a message.
 *
 * Pattern/rules tests were removed—they assumed a dedicated test DB with truncation
 * and direct writes. Production has effect_patterns (read-only), rules (write-locked),
 * and cannot be truncated.
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest"
import { Effect } from "effect"
import { sql } from "drizzle-orm"

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1"
let dbAvailable = false

describe("Db + Analytics + ApiKeys integration (real DB)", () => {
  beforeAll(async () => {
    if (!runIntegrationTests) return
    try {
      const { db } = await import("../../db/client")
      await db.execute(sql`SELECT 1`)
      dbAvailable = true
    } catch (err) {
      console.warn(
        "Integration tests skipped: database unavailable (set DATABASE_URL to a running Postgres to run them).",
        err instanceof Error ? err.message : err
      )
    }
  })

  beforeEach(async () => {
    if (!runIntegrationTests || !dbAvailable) return
    const { db } = await import("../../db/client")
    await db.execute(
      sql`TRUNCATE analytics_events, api_keys, consulting_inquiries, waitlist_signups, users RESTART IDENTITY CASCADE`
    )
  })

  describe("Waitlist and Analytics", () => {
    it("inserts waitlist signup and tracks event", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const AnalyticsApi = await import("../Analytics/api")
      const signup = await Effect.runPromise(
        DbApi.insertWaitlistSignup("waitlist@example.com", "playground", "Developer")
      )
      expect(signup.email).toBe("waitlist@example.com")
      expect(signup.source).toBe("playground")
      expect(signup.role_or_company).toBe("Developer")
      expect(signup.id).toBeDefined()
      expect(signup.created_at).toBeDefined()

      await Effect.runPromise(
        AnalyticsApi.trackEvent({ type: "waitlist_submitted", source: "playground" })
      )
    })
  })

  describe("Consulting inquiry", () => {
    it("inserts consulting inquiry", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const inquiry = await Effect.runPromise(
        DbApi.insertConsultingInquiry({
          name: "Jane Doe",
          email: "jane@example.com",
          role: "CTO",
          company: "Acme",
          description: "Need help with Effect.",
        })
      )
      expect(inquiry.name).toBe("Jane Doe")
      expect(inquiry.email).toBe("jane@example.com")
      expect(inquiry.description).toBe("Need help with Effect.")
      expect(inquiry.id).toBeDefined()
    })
  })

  describe("User and API keys", () => {
    it("creates user, API key, lists, and revokes", { skip: !runIntegrationTests }, async () => {
      if (!dbAvailable) return
      const DbApi = await import("../Db/api")
      const ApiKeysApi = await import("../ApiKeys/api")
      const user = await Effect.runPromise(
        DbApi.upsertUser({
          workosId: "workos-test-123",
          email: "apikey@example.com",
          name: "API Key User",
          avatarUrl: undefined,
        })
      )
      expect(user).not.toBeNull()
      expect(user?.email).toBe("apikey@example.com")
      const userId = user?.id

      const created = await Effect.runPromise(ApiKeysApi.createApiKey(userId, "My Key"))
      expect(created.plaintext).toMatch(/^ek_[a-f0-9]{40}$/)
      expect(created.record.name).toBe("My Key")
      expect(created.record.user_id).toBe(userId)

      const listed = await Effect.runPromise(ApiKeysApi.listUserApiKeys(userId))
      expect(listed.length).toBe(1)
      expect(listed[0].name).toBe("My Key")

      const revoked = await Effect.runPromise(
        ApiKeysApi.revokeUserApiKey(created.record.id, userId)
      )
      expect(revoked).not.toBeNull()
      expect(revoked?.revoked_at).toBeDefined()

      const listedAfter = await Effect.runPromise(ApiKeysApi.listUserApiKeys(userId))
      expect(listedAfter.length).toBe(1)
      expect(listedAfter[0].revoked_at).toBeDefined()
    })
  })

})
