/**
 * End-to-end tests for complete service flows.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect } from "effect"
import * as DbApi from "@/services/Db/api"
import * as AuthApi from "@/services/Auth/api"
import * as ApiKeysApi from "@/services/ApiKeys/api"
import * as AnalyticsApi from "@/services/Analytics/api"
import * as EmailApi from "@/services/Email/api"
import type { DbUser } from "@/services/Db/types"

// Mock types for Drizzle query builders
interface MockInsertBuilder {
  values: ReturnType<typeof vi.fn>
  onConflictDoUpdate?: ReturnType<typeof vi.fn>
  returning: ReturnType<typeof vi.fn>
}

interface MockSelectBuilder {
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  orderBy?: ReturnType<typeof vi.fn>
}

interface MockUpdateBuilder {
  set: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  returning: ReturnType<typeof vi.fn>
}

interface MockResendClient {
  emails: {
    send: ReturnType<typeof vi.fn>
  }
}

// Mock all external dependencies for E2E tests
vi.mock("../../db/client", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: vi.fn(async () => {
    throw new Error("isn't covered by the AuthKit middleware")
  }),
}))

describe("E2E Service Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.WORKOS_API_KEY = "sk_test"
    process.env.WORKOS_CLIENT_ID = "client_test"
    process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
    process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
  })

  describe("User registration sync (callback onSuccess flow)", () => {
    it("upserts user from WorkOS profile and sets session cookie", async () => {
      const createdAt = new Date()
      const updatedAt = new Date()
      const mockUser: DbUser = {
        id: "user-123",
        workos_id: "workos-123",
        email: "newuser@example.com",
        name: "New User",
        avatar_url: "https://example.com/avatar.jpg",
        preferences: {},
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      }

      const drizzleRow = {
        id: "user-123",
        workosId: "workos-123",
        email: "newuser@example.com",
        name: "New User",
        avatarUrl: "https://example.com/avatar.jpg",
        preferences: {},
        createdAt,
        updatedAt,
      }
      const { db } = await import("../../db/client")
      const mockInsert: MockInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([drizzleRow]),
      }
      vi.mocked(db.insert).mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>)

      const { cookies } = await import("next/headers")
      const mockCookieStore = { set: vi.fn() }
      vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

      // Same logic as auth callback onSuccess: upsert user then set session cookie
      const user = await Effect.runPromise(
        DbApi.upsertUser({
          workosId: "workos-123",
          email: "newuser@example.com",
          name: "New User",
          avatarUrl: "https://example.com/avatar.jpg",
        })
      )
      await AuthApi.setSessionCookie(user.workos_id)

      expect(user).toEqual(mockUser)
      expect(mockCookieStore.set).toHaveBeenCalled()
    })
  })

  describe("API Key Management Flow", () => {
    it("should complete full API key lifecycle", async () => {
      const mockApiKey = {
        id: "key-123",
        user_id: "user-123",
        name: "My API Key",
        key_prefix: "ek_test12",
        key_hash: "hashed_token",
        created_at: new Date().toISOString(),
        revoked_at: null,
      }

      const createdAt = new Date()
      const revokedAt = new Date()
      const revokedApiKey = {
        ...mockApiKey,
        revoked_at: revokedAt.toISOString(),
      }

      const { db } = await import("../../db/client")

      // Step 1: Create API key
      const drizzleApiKeyRow = {
        id: "key-123",
        userId: "user-123",
        name: "My API Key",
        keyPrefix: "ek_test12",
        keyHash: "hashed_token",
        createdAt,
        revokedAt: null,
      }
      const mockInsert: MockInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([drizzleApiKeyRow]),
      }
      vi.mocked(db.insert).mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>)

      const created = await Effect.runPromise(ApiKeysApi.createApiKey("user-123", "My API Key"))

      expect(created.plaintext).toMatch(/^ek_[a-f0-9]{40}$/)
      expect(created.record).toEqual(mockApiKey)

      // Step 2: List API keys
      const drizzleApiKeyRow2 = {
        id: "key-123",
        userId: "user-123",
        name: "My API Key",
        keyPrefix: "ek_test12",
        keyHash: "hashed_token",
        createdAt,
        revokedAt: null,
      }
      const mockSelect: MockSelectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([drizzleApiKeyRow2]),
      }
      vi.mocked(db.select).mockReturnValue(mockSelect as unknown as ReturnType<typeof db.select>)

      const listed = await Effect.runPromise(ApiKeysApi.listUserApiKeys("user-123"))

      expect(listed).toHaveLength(1)
      expect(listed[0]).toEqual(mockApiKey)

      // Step 3: Verify API key
      const { hashToken } = await import("../ApiKeys/helpers")
      const expectedHash = hashToken(created.plaintext)
      const isValid = ApiKeysApi.verifyApiKey(created.plaintext, expectedHash)
      expect(isValid).toBe(true)

      // Step 4: Revoke API key
      const drizzleRevokedRow = {
        id: "key-123",
        userId: "user-123",
        name: "My API Key",
        keyPrefix: "ek_test12",
        keyHash: "hashed_token",
        createdAt,
        revokedAt,
      }
      const mockUpdate: MockUpdateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([drizzleRevokedRow]),
      }
      vi.mocked(db.update).mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>)

      const revoked = await Effect.runPromise(ApiKeysApi.revokeUserApiKey("key-123", "user-123"))

      expect(revoked).toEqual(revokedApiKey)
      expect(revoked?.revoked_at).toBeTruthy()
    })
  })

  describe("Waitlist Signup Flow", () => {
    it("should complete waitlist signup with email and analytics", async () => {
      const signupCreatedAt = new Date()
      const mockSignup = {
        id: "signup-123",
        email: "waitlist@example.com",
        role_or_company: "Developer",
        source: "playground" as const,
        created_at: signupCreatedAt.toISOString(),
      }

      const { db } = await import("../../db/client")

      // Step 1: Insert waitlist signup
      const drizzleSignupRow = {
        id: "signup-123",
        email: "waitlist@example.com",
        roleOrCompany: "Developer",
        source: "playground" as const,
        createdAt: signupCreatedAt,
      }
      const mockInsert: MockInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([drizzleSignupRow]),
      }
      vi.mocked(db.insert).mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>)

      const signup = await Effect.runPromise(
        DbApi.insertWaitlistSignup("waitlist@example.com", "playground", "Developer")
      )

      expect(signup).toEqual(mockSignup)

      // Step 2: Track analytics event
      const analyticsInsert: MockInsertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn(),
      }
      vi.mocked(db.insert).mockReturnValue(analyticsInsert as unknown as ReturnType<typeof db.insert>)

      const analyticsResult = await Effect.runPromise(
        AnalyticsApi.trackEvent({
          type: "waitlist_submitted",
          source: "playground",
        })
      )

      expect(analyticsResult).toBeUndefined()

      // Step 3: Send confirmation email
      const mockResendClient: MockResendClient = {
        emails: {
          send: vi.fn().mockResolvedValue({ id: "email-123" }),
        },
      }

      const emailHelpers = await import("../Email/helpers")
      vi.spyOn(emailHelpers, "getResendClient").mockReturnValue(mockResendClient as unknown as ReturnType<typeof emailHelpers.getResendClient>)

      const emailResult = await Effect.runPromise(
        EmailApi.sendWaitlistConfirmation("waitlist@example.com", "playground")
      )

      expect(emailResult).toBeUndefined()
      expect(mockResendClient.emails.send).toHaveBeenCalled()
    })
  })

  describe("Consulting Inquiry Flow", () => {
    it("should complete consulting inquiry with email and analytics", async () => {
      const inquiryCreatedAt = new Date()
      const mockInquiry = {
        id: "inquiry-123",
        name: "John Doe",
        email: "john@example.com",
        role: "CTO",
        company: "Acme Corp",
        description: "Need help with Effect.ts",
        created_at: inquiryCreatedAt.toISOString(),
      }

      const { db } = await import("../../db/client")

      // Step 1: Insert consulting inquiry
      const drizzleInquiryRow = {
        id: "inquiry-123",
        name: "John Doe",
        email: "john@example.com",
        role: "CTO",
        company: "Acme Corp",
        description: "Need help with Effect.ts",
        createdAt: inquiryCreatedAt,
      }
      const mockInsert: MockInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([drizzleInquiryRow]),
      }
      vi.mocked(db.insert).mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>)

      const inquiry = await Effect.runPromise(
        DbApi.insertConsultingInquiry({
          name: "John Doe",
          email: "john@example.com",
          role: "CTO",
          company: "Acme Corp",
          description: "Need help with Effect.ts",
        })
      )

      expect(inquiry).toEqual(mockInquiry)

      // Step 2: Track analytics
      const analyticsInsert: MockInsertBuilder = {
        values: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn(),
      }
      vi.mocked(db.insert).mockReturnValue(analyticsInsert as unknown as ReturnType<typeof db.insert>)

      await Effect.runPromise(
        AnalyticsApi.trackEvent({
          type: "consulting_submitted",
        })
      )

      // Step 3: Send confirmation email
      const mockResendClient: MockResendClient = {
        emails: {
          send: vi.fn().mockResolvedValue({ id: "email-123" }),
        },
      }

      const emailHelpers = await import("../Email/helpers")
      vi.spyOn(emailHelpers, "getResendClient").mockReturnValue(mockResendClient as unknown as ReturnType<typeof emailHelpers.getResendClient>)

      await Effect.runPromise(EmailApi.sendConsultingConfirmation("john@example.com", "John Doe"))

      expect(mockResendClient.emails.send).toHaveBeenCalled()
    })
  })

  describe("User Preferences Update Flow", () => {
    it("should update user preferences successfully", async () => {
      const userCreatedAt = new Date()
      const userUpdatedAt = new Date()
      const mockUser: DbUser = {
        id: "user-123",
        workos_id: "workos-123",
        email: "user@example.com",
        name: "Test User",
        avatar_url: null,
        preferences: { theme: "dark", notifications: true },
        created_at: userCreatedAt.toISOString(),
        updated_at: userUpdatedAt.toISOString(),
      }

      const { db } = await import("../../db/client")
      const { withAuth } = await import("@workos-inc/authkit-nextjs")
      vi.mocked(withAuth).mockResolvedValue({
        user: {
          id: "workos-123",
          email: "user@example.com",
        },
      } as Awaited<ReturnType<typeof withAuth>>)

      // Mock user lookup
      const drizzleUserRow = {
        id: "user-123",
        workosId: "workos-123",
        email: "user@example.com",
        name: "Test User",
        avatarUrl: null,
        preferences: { theme: "dark", notifications: true },
        createdAt: userCreatedAt,
        updatedAt: userUpdatedAt,
      }
      const mockSelect: MockSelectBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([drizzleUserRow]),
      }
      vi.mocked(db.select).mockReturnValue(mockSelect as unknown as ReturnType<typeof db.select>)

      const currentUser = await AuthApi.getCurrentUser()
      expect(currentUser).toEqual(mockUser)

      // Mock preferences update
      const updatedPreferences = { theme: "light", notifications: false }
      const preferencesUpdatedAt = new Date()
      const drizzleUpdatedRow = {
        id: "user-123",
        workosId: "workos-123",
        email: "user@example.com",
        name: "Test User",
        avatarUrl: null,
        preferences: updatedPreferences,
        createdAt: userCreatedAt,
        updatedAt: preferencesUpdatedAt,
      }
      const expectedUpdatedUser = {
        ...mockUser,
        preferences: updatedPreferences,
        updated_at: preferencesUpdatedAt.toISOString(),
      }
      const mockUpdate: MockUpdateBuilder = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([drizzleUpdatedRow]),
      }
      vi.mocked(db.update).mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>)

      const result = await Effect.runPromise(
        DbApi.updateUserPreferences("user-123", { theme: "light", notifications: false })
      )

      expect(result).toEqual(expectedUpdatedUser)
      expect(result?.preferences.theme).toBe("light")
    })
  })
})
