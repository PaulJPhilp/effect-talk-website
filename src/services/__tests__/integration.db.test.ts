/**
 * Integration tests for Db, Analytics, and ApiKeys using the real database.
 * No mocks. Set RUN_INTEGRATION_TESTS=1 and DATABASE_URL to a test database to run.
 * Skipped when RUN_INTEGRATION_TESTS is not set (avoids loading DB client).
 */

import { describe, it, expect, beforeEach } from "vitest"
import { Effect } from "effect"
import { sql } from "drizzle-orm"

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1"

describe("Db + Analytics + ApiKeys integration (real DB)", () => {
  beforeEach(async () => {
    if (!runIntegrationTests) return
    const { db } = await import("../../db/client")
    await db.execute(
      sql`TRUNCATE analytics_events, api_keys, consulting_inquiries, waitlist_signups, users RESTART IDENTITY CASCADE`
    )
  })

  describe("Waitlist and Analytics", () => {
    it("inserts waitlist signup and tracks event", { skip: !runIntegrationTests }, async () => {
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
