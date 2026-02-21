/**
 * Unit tests for ApiKeys service API.
 *
 * Tests the ApiKeys service interface via NoOp and custom test layers.
 * verifyApiKey is a pure function tested directly.
 * No vi.mock, no Drizzle chain stubs.
 */

import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { ApiKeys, ApiKeysNoOp } from "@/services/ApiKeys/service"
import { ApiKeyError } from "@/services/ApiKeys/errors"
import { hashToken } from "@/services/ApiKeys/helpers"
import { verifyApiKey } from "@/services/ApiKeys/api"
import type { DbApiKey } from "@/services/Db/types"

describe("ApiKeys api", () => {
  describe("verifyApiKey", () => {
    it("returns true when token matches stored hash", () => {
      process.env.API_KEY_PEPPER = "test-pepper"
      const token = "ek_" + "a".repeat(40)
      const storedHash = hashToken(token)
      expect(verifyApiKey(token, storedHash)).toBe(true)
    })

    it("returns false when token does not match stored hash", () => {
      process.env.API_KEY_PEPPER = "test-pepper"
      const token = "ek_" + "a".repeat(40)
      const wrongHash = hashToken("ek_" + "b".repeat(40))
      expect(verifyApiKey(token, wrongHash)).toBe(false)
    })
  })

  describe("createApiKey", () => {
    it("succeeds with ApiKeysNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys
        return yield* svc.createApiKey("user-1", "My Key")
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(ApiKeysNoOp)))
      expect(result.plaintext).toBe("ek_test")
      expect(result.record).toBeDefined()
    })

    it("returns ApiKeyError from a failing layer", async () => {
      const FailingApiKeys = Layer.succeed(ApiKeys, {
        createApiKey: () => Effect.fail(new ApiKeyError({ message: "DB error" })),
        listUserApiKeys: () => Effect.succeed([]),
        revokeUserApiKey: () => Effect.succeed(null),
      })
      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys
        return yield* svc.createApiKey("user-1", "Key")
      })
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(FailingApiKeys), Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") expect(result.left).toBeInstanceOf(ApiKeyError)
    })
  })

  describe("listUserApiKeys", () => {
    it("returns empty list with ApiKeysNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys
        return yield* svc.listUserApiKeys("user-1")
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(ApiKeysNoOp)))
      expect(result).toEqual([])
    })

    it("returns ApiKeyError from a failing layer", async () => {
      const FailingApiKeys = Layer.succeed(ApiKeys, {
        createApiKey: () => Effect.fail(new ApiKeyError({ message: "DB error" })),
        listUserApiKeys: () => Effect.fail(new ApiKeyError({ message: "DB error" })),
        revokeUserApiKey: () => Effect.succeed(null),
      })
      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys
        return yield* svc.listUserApiKeys("user-1")
      })
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(FailingApiKeys), Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") expect(result.left).toBeInstanceOf(ApiKeyError)
    })
  })

  describe("revokeUserApiKey", () => {
    it("returns null with ApiKeysNoOp (not found)", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys
        return yield* svc.revokeUserApiKey("key-1", "user-1")
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(ApiKeysNoOp)))
      expect(result).toBeNull()
    })

    it("returns revoked key from a custom layer", async () => {
      const revokedKey: DbApiKey = {
        id: "key-1",
        user_id: "user-1",
        name: "Test Key",
        key_prefix: "ek_test12",
        key_hash: "hashed",
        created_at: new Date().toISOString(),
        revoked_at: new Date().toISOString(),
      }
      const CustomApiKeys = Layer.succeed(ApiKeys, {
        createApiKey: () => Effect.fail(new ApiKeyError({ message: "not used" })),
        listUserApiKeys: () => Effect.succeed([]),
        revokeUserApiKey: () => Effect.succeed(revokedKey),
      })
      const program = Effect.gen(function* () {
        const svc = yield* ApiKeys
        return yield* svc.revokeUserApiKey("key-1", "user-1")
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(CustomApiKeys)))
      expect(result).toEqual(revokedKey)
      expect(result?.revoked_at).toBeTruthy()
    })
  })

  describe("ApiKeyError", () => {
    it("is constructible with message", () => {
      const err = new ApiKeyError({ message: "test" })
      expect(err._tag).toBe("ApiKeyError")
      expect(err.message).toBe("test")
    })
  })
})
