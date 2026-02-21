/**
 * Unit tests for Auth service API.
 *
 * isWorkOSConfigured tests use Auth.Default since the method only reads
 * process.env (no cookies/withAuth). Session/user tests use AuthNoOp and
 * custom test layers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect, Layer } from "effect"
import type { DbUser } from "@/services/Db/types"

// Exception: structural mocks required — @workos-inc/authkit-nextjs imports
// next/cache which doesn't resolve in Vitest. These stubs return valid shapes
// only; no call-verification assertions.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined, set: () => {}, delete: () => {} }),
}))
vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: () => Promise.resolve({ user: null }),
}))

// Import after mocks are registered so module resolution succeeds.
const { Auth, AuthNoOp } = await import("@/services/Auth/service")

describe("Auth api", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  describe("isWorkOSConfigured", () => {
    it("returns false when WORKOS_API_KEY is missing", () => {
      process.env.WORKOS_API_KEY = ""
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const result = Effect.runSync(
        Effect.gen(function* () {
          const svc = yield* Auth
          return svc.isWorkOSConfigured()
        }).pipe(Effect.provide(Auth.Default))
      )
      expect(result).toBe(false)
    })

    it("returns false when WORKOS_CLIENT_ID is missing", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = ""
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const result = Effect.runSync(
        Effect.gen(function* () {
          const svc = yield* Auth
          return svc.isWorkOSConfigured()
        }).pipe(Effect.provide(Auth.Default))
      )
      expect(result).toBe(false)
    })

    it("returns false when redirect URI contains placeholder", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = "http://xxx/callback"
      delete process.env.WORKOS_REDIRECT_URI
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const result = Effect.runSync(
        Effect.gen(function* () {
          const svc = yield* Auth
          return svc.isWorkOSConfigured()
        }).pipe(Effect.provide(Auth.Default))
      )
      expect(result).toBe(false)
    })

    it("returns false when WORKOS_COOKIE_PASSWORD is shorter than 32 chars", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "short"
      const result = Effect.runSync(
        Effect.gen(function* () {
          const svc = yield* Auth
          return svc.isWorkOSConfigured()
        }).pipe(Effect.provide(Auth.Default))
      )
      expect(result).toBe(false)
    })

    it("returns true when all required vars are set and valid", () => {
      process.env.WORKOS_API_KEY = "sk_test"
      process.env.WORKOS_CLIENT_ID = "client_xx"
      process.env.WORKOS_REDIRECT_URI = "http://localhost:3000/auth/callback"
      process.env.WORKOS_COOKIE_PASSWORD = "a".repeat(32)
      const result = Effect.runSync(
        Effect.gen(function* () {
          const svc = yield* Auth
          return svc.isWorkOSConfigured()
        }).pipe(Effect.provide(Auth.Default))
      )
      expect(result).toBe(true)
    })
  })

  describe("clearSessionCookie", () => {
    it("succeeds with AuthNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.clearSessionCookie()
      })
      await Effect.runPromise(program.pipe(Effect.provide(AuthNoOp)))
    })
  })

  describe("setSessionCookie", () => {
    it("succeeds with AuthNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.setSessionCookie("user-123")
      })
      await Effect.runPromise(program.pipe(Effect.provide(AuthNoOp)))
    })
  })

  describe("getSessionUserId", () => {
    it("returns null with AuthNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.getSessionUserId()
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(AuthNoOp)))
      expect(result).toBeNull()
    })

    it("returns userId from a custom layer", async () => {
      const CustomAuth = Layer.succeed(Auth, {
        isWorkOSConfigured: () => false,
        setSessionCookie: () => Effect.void,
        clearSessionCookie: () => Effect.void,
        getSessionUserId: () => Effect.succeed("user-123"),
        getCurrentUser: () => Effect.succeed(null),
        requireAuth: () => Effect.die("not used"),
      })
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.getSessionUserId()
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(CustomAuth)))
      expect(result).toBe("user-123")
    })
  })

  describe("getCurrentUser", () => {
    it("returns null with AuthNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.getCurrentUser()
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(AuthNoOp)))
      expect(result).toBeNull()
    })

    it("returns user from a custom layer", async () => {
      const mockUser: DbUser = {
        id: "user-123",
        workos_id: "workos-123",
        email: "u@example.com",
        name: "Test",
        avatar_url: null,
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const CustomAuth = Layer.succeed(Auth, {
        isWorkOSConfigured: () => true,
        setSessionCookie: () => Effect.void,
        clearSessionCookie: () => Effect.void,
        getSessionUserId: () => Effect.succeed("user-123"),
        getCurrentUser: () => Effect.succeed(mockUser),
        requireAuth: () => Effect.succeed(mockUser),
      })
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.getCurrentUser()
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(CustomAuth)))
      expect(result).toEqual(mockUser)
    })
  })

  describe("requireAuth", () => {
    it("dies with AuthNoOp (no authenticated user)", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.requireAuth()
      })
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(AuthNoOp)))
      expect(exit._tag).toBe("Failure")
    })

    it("returns user from a custom layer with authenticated user", async () => {
      const mockUser: DbUser = {
        id: "user-123",
        workos_id: "workos-123",
        email: "u@example.com",
        name: "Test",
        avatar_url: null,
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const CustomAuth = Layer.succeed(Auth, {
        isWorkOSConfigured: () => true,
        setSessionCookie: () => Effect.void,
        clearSessionCookie: () => Effect.void,
        getSessionUserId: () => Effect.succeed("user-123"),
        getCurrentUser: () => Effect.succeed(mockUser),
        requireAuth: () => Effect.succeed(mockUser),
      })
      const program = Effect.gen(function* () {
        const svc = yield* Auth
        return yield* svc.requireAuth()
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(CustomAuth)))
      expect(result).toEqual(mockUser)
    })
  })
})
