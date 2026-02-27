/**
 * Cross-service flow tests using composed NoOp layers.
 *
 * Each test exercises the Effect service interfaces via NoOp or custom
 * test layers. No Drizzle chain stubs or behavioral mocks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect, Layer } from "effect"

// Exception: structural mocks required — @workos-inc/authkit-nextjs imports
// next/cache which doesn't resolve in Vitest. These stubs return valid shapes
// only; no call-verification assertions.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined, set: () => {}, delete: () => {} }),
}))
vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: () => Promise.resolve({ user: null }),
}))

import { Db, DbNoOp } from "@/services/Db/service"
import { Auth, AuthNoOp } from "@/services/Auth/service"
import { ApiKeys } from "@/services/ApiKeys/service"
import { Analytics, AnalyticsNoOp } from "@/services/Analytics/service"
import { Email, EmailNoOp } from "@/services/Email/service"
import type { DbUser, DbApiKey } from "@/services/Db/types"
import type { WaitlistSignup, ConsultingInquiry } from "@/services/Db/types"
import { verifyApiKey, type ApiKeysService } from "@/services/ApiKeys/api"
import { hashToken } from "@/services/ApiKeys/helpers"
import type { CreatedApiKey } from "@/services/ApiKeys/types"

describe("E2E Service Flows", () => {
  beforeEach(() => {
    process.env.API_KEY_PEPPER = "test-pepper"
  })

  describe("User registration sync (callback onSuccess flow)", () => {
    it("upserts user and sets session cookie via service layers", async () => {
      const mockUser: DbUser = {
        id: "user-123",
        workos_id: "workos-123",
        email: "newuser@example.com",
        name: "New User",
        avatar_url: "https://example.com/avatar.jpg",
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const CustomDb = Layer.succeed(Db, {
        ...Effect.runSync(Effect.provide(Effect.gen(function* () { return yield* Db }), DbNoOp)),
        upsertUser: () => Effect.succeed(mockUser),
      })

      const program = Effect.gen(function* () {
        const db = yield* Db
        const auth = yield* Auth

        // Step 1: Upsert user from WorkOS profile
        const user = yield* db.upsertUser({
          workosId: "workos-123",
          email: "newuser@example.com",
          name: "New User",
          avatarUrl: "https://example.com/avatar.jpg",
        })

        // Step 2: Set session cookie
        yield* auth.setSessionCookie(user.workos_id)

        return user
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.mergeAll(CustomDb, AuthNoOp, AnalyticsNoOp)))
      )

      expect(result).toEqual(mockUser)
      expect(result.email).toBe("newuser@example.com")
    })
  })

  describe("API Key Management Flow", () => {
    it("completes full API key lifecycle (create, list, verify, revoke)", async () => {
      const mockApiKey: DbApiKey = {
        id: "key-123",
        user_id: "user-123",
        name: "My API Key",
        key_prefix: "ek_test12",
        key_hash: "hashed_token",
        created_at: new Date().toISOString(),
        revoked_at: null,
      }
      const revokedApiKey: DbApiKey = {
        ...mockApiKey,
        revoked_at: new Date().toISOString(),
      }

      let revokeCallCount = 0
      const CustomApiKeys = Layer.succeed(ApiKeys, {
        createApiKey: () =>
          Effect.succeed({ plaintext: "ek_" + "a".repeat(40), record: mockApiKey } as CreatedApiKey),
        listUserApiKeys: () => Effect.succeed([mockApiKey]),
        revokeUserApiKey: () => {
          revokeCallCount++
          return Effect.succeed(revokedApiKey)
        },
      } satisfies ApiKeysService)

      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys

        // Step 1: Create API key
        const created = yield* svc.createApiKey("user-123", "My API Key")
        expect(created.plaintext).toMatch(/^ek_/)
        expect(created.record).toEqual(mockApiKey)

        // Step 2: List API keys
        const listed = yield* svc.listUserApiKeys("user-123")
        expect(listed).toHaveLength(1)
        expect(listed[0]).toEqual(mockApiKey)

        // Step 3: Verify API key (pure function, no service needed)
        const expectedHash = hashToken(created.plaintext)
        const isValid = verifyApiKey(created.plaintext, expectedHash)
        expect(isValid).toBe(true)

        // Step 4: Revoke API key
        const revoked = yield* svc.revokeUserApiKey("key-123", "user-123")
        expect(revoked).toEqual(revokedApiKey)
        expect(revoked?.revoked_at).toBeTruthy()

        return created
      })

      await Effect.runPromise(program.pipe(Effect.provide(CustomApiKeys)))
      expect(revokeCallCount).toBe(1)
    })
  })

  describe("Waitlist Signup Flow", () => {
    it("completes waitlist signup with email and analytics", async () => {
      const mockSignup: WaitlistSignup = {
        id: "signup-123",
        email: "waitlist@example.com",
        role_or_company: "Developer",
        source: "playground",
        created_at: new Date().toISOString(),
      }

      const CustomDb = Layer.succeed(Db, {
        ...Effect.runSync(Effect.provide(Effect.gen(function* () { return yield* Db }), DbNoOp)),
        insertWaitlistSignup: () => Effect.succeed(mockSignup),
      })

      const program = Effect.gen(function* () {
        const db = yield* Db
        const analytics = yield* Analytics
        const email = yield* Email

        // Step 1: Insert waitlist signup
        const signup = yield* db.insertWaitlistSignup("waitlist@example.com", "playground", "Developer")
        expect(signup).toEqual(mockSignup)

        // Step 2: Track analytics event
        yield* analytics.trackEvent({ type: "waitlist_submitted", source: "playground" })

        // Step 3: Send confirmation email
        yield* email.sendWaitlistConfirmation("waitlist@example.com", "playground")

        return signup
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.mergeAll(CustomDb, AnalyticsNoOp, EmailNoOp)))
      )

      expect(result).toEqual(mockSignup)
    })
  })

  describe("Consulting Inquiry Flow", () => {
    it("completes consulting inquiry with email and analytics", async () => {
      const mockInquiry: ConsultingInquiry = {
        id: "inquiry-123",
        name: "John Doe",
        email: "john@example.com",
        role: "CTO",
        company: "Acme Corp",
        description: "Need help with Effect.ts",
        created_at: new Date().toISOString(),
      }

      const CustomDb = Layer.succeed(Db, {
        ...Effect.runSync(Effect.provide(Effect.gen(function* () { return yield* Db }), DbNoOp)),
        insertConsultingInquiry: () => Effect.succeed(mockInquiry),
      })

      const program = Effect.gen(function* () {
        const db = yield* Db
        const analytics = yield* Analytics
        const email = yield* Email

        // Step 1: Insert consulting inquiry
        const inquiry = yield* db.insertConsultingInquiry({
          name: "John Doe",
          email: "john@example.com",
          role: "CTO",
          company: "Acme Corp",
          description: "Need help with Effect.ts",
        })
        expect(inquiry).toEqual(mockInquiry)

        // Step 2: Track analytics
        yield* analytics.trackEvent({ type: "consulting_submitted" })

        // Step 3: Send confirmation email
        yield* email.sendConsultingConfirmation("john@example.com", "John Doe")

        return inquiry
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.mergeAll(CustomDb, AnalyticsNoOp, EmailNoOp)))
      )

      expect(result).toEqual(mockInquiry)
    })
  })

  describe("User Preferences Update Flow", () => {
    it("updates user preferences successfully", async () => {
      const mockUser: DbUser = {
        id: "user-123",
        workos_id: "workos-123",
        email: "user@example.com",
        name: "Test User",
        avatar_url: null,
        preferences: { theme: "dark", notifications: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const updatedUser: DbUser = {
        ...mockUser,
        preferences: { theme: "light", notifications: false },
        updated_at: new Date().toISOString(),
      }

      const CustomDb = Layer.succeed(Db, {
        ...Effect.runSync(Effect.provide(Effect.gen(function* () { return yield* Db }), DbNoOp)),
        updateUserPreferences: () => Effect.succeed(updatedUser),
      })
      const CustomAuth = Layer.succeed(Auth, {
        isWorkOSConfigured: () => true,
        setSessionCookie: () => Effect.void,
        clearSessionCookie: () => Effect.void,
        getSessionUserId: () => Effect.succeed("user-123"),
        getCurrentUser: () => Effect.succeed(mockUser),
        requireAuth: () => Effect.succeed(mockUser),
      })

      const program = Effect.gen(function* () {
        const auth = yield* Auth
        const db = yield* Db

        // Step 1: Get current user
        const currentUser = yield* auth.getCurrentUser()
        expect(currentUser).toEqual(mockUser)

        // Step 2: Update preferences
        const result = yield* db.updateUserPreferences("user-123", {
          theme: "light",
          notifications: false,
        })

        return result
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(Layer.mergeAll(CustomDb, CustomAuth)))
      )

      expect(result).toEqual(updatedUser)
      expect(result?.preferences).toEqual({ theme: "light", notifications: false })
    })
  })
})
