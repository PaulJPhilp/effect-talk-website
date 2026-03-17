import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DbError } from "@/services/Db/errors"
import type { DbUser } from "@/services/Db/types"
import {
  deleteCustomerConfigValue,
  getCustomerConfig,
  getCustomerConfigValue,
  replaceCustomerConfig,
  setCustomerConfigValue,
} from "@/services/CustomerConfig/api"
import { CustomerConfigError } from "@/services/CustomerConfig/errors"
import { CustomerConfig, CustomerConfigNoOp } from "@/services/CustomerConfig/service"

const getUserByIdMock = vi.fn()
const updateUserPreferencesMock = vi.fn()

vi.mock("@/services/Db/api", () => ({
  getUserById: (userId: string) => getUserByIdMock(userId),
  updateUserPreferences: (userId: string, preferences: Record<string, unknown>) =>
    updateUserPreferencesMock(userId, preferences),
}))

function makeUser(preferences: Record<string, unknown> = {}): DbUser {
  return {
    id: "user-123",
    workos_id: "workos-123",
    email: "user@example.com",
    name: "Test User",
    avatar_url: null,
    preferences,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

describe("CustomerConfig api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty config with CustomerConfigNoOp", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* CustomerConfig
      return yield* svc.getCustomerConfig("user-1")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(CustomerConfigNoOp)))

    expect(result).toEqual({})
  })

  it("reads existing config", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))

    const result = await Effect.runPromise(getCustomerConfig("user-123"))

    expect(result).toEqual({ theme: "dark" })
  })

  it("returns empty config when preferences has no keys", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({})))

    const result = await Effect.runPromise(getCustomerConfig("user-123"))

    expect(result).toEqual({})
  })

  it("replaces the whole config", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))
    updateUserPreferencesMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "light", notifications: false }))
    )

    const result = await Effect.runPromise(
      replaceCustomerConfig("user-123", { theme: "light", notifications: false })
    )

    expect(updateUserPreferencesMock).toHaveBeenCalledWith("user-123", {
      theme: "light",
      notifications: false,
    })
    expect(result).toEqual({ theme: "light", notifications: false })
  })

  it("reads a single config value", async () => {
    getUserByIdMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "dark", notifications: true }))
    )

    const result = await Effect.runPromise(getCustomerConfigValue("user-123", "theme"))

    expect(result).toBe("dark")
  })

  it("returns null for a missing config value", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))

    const result = await Effect.runPromise(getCustomerConfigValue("user-123", "missing"))

    expect(result).toBeNull()
  })

  it("sets a new key", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))
    updateUserPreferencesMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "dark", notifications: true }))
    )

    const result = await Effect.runPromise(
      setCustomerConfigValue("user-123", "notifications", true)
    )

    expect(updateUserPreferencesMock).toHaveBeenCalledWith("user-123", {
      theme: "dark",
      notifications: true,
    })
    expect(result).toEqual({ theme: "dark", notifications: true })
  })

  it("overwrites an existing key", async () => {
    getUserByIdMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "dark", notifications: true }))
    )
    getUserByIdMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "dark", notifications: true }))
    )
    updateUserPreferencesMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "light", notifications: true }))
    )

    const result = await Effect.runPromise(
      setCustomerConfigValue("user-123", "theme", "light")
    )

    expect(result).toEqual({ theme: "light", notifications: true })
  })

  it("deletes an existing key", async () => {
    getUserByIdMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "dark", notifications: true }))
    )
    getUserByIdMock.mockReturnValueOnce(
      Effect.succeed(makeUser({ theme: "dark", notifications: true }))
    )
    updateUserPreferencesMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))

    const result = await Effect.runPromise(
      deleteCustomerConfigValue("user-123", "notifications")
    )

    expect(updateUserPreferencesMock).toHaveBeenCalledWith("user-123", {
      theme: "dark",
    })
    expect(result).toEqual({ theme: "dark" })
  })

  it("treats deleting a missing key as a no-op", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(makeUser({ theme: "dark" })))

    const result = await Effect.runPromise(
      deleteCustomerConfigValue("user-123", "missing")
    )

    expect(updateUserPreferencesMock).not.toHaveBeenCalled()
    expect(result).toEqual({ theme: "dark" })
  })

  it("surfaces user-not-found as CustomerConfigError", async () => {
    getUserByIdMock.mockReturnValueOnce(Effect.succeed(null))

    const result = await Effect.runPromise(getCustomerConfig("missing-user").pipe(Effect.either))

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CustomerConfigError)
      expect(result.left.message).toContain("missing-user")
    }
  })

  it("maps Db failures to CustomerConfigError", async () => {
    getUserByIdMock.mockReturnValueOnce(
      Effect.fail(new DbError({ message: "database exploded" }))
    )

    const result = await Effect.runPromise(getCustomerConfig("user-123").pipe(Effect.either))

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CustomerConfigError)
      expect(result.left.message).toBe("database exploded")
    }
  })

  it("returns CustomerConfigError from a failing custom layer", async () => {
    const FailingCustomerConfig = Layer.succeed(CustomerConfig, {
      getCustomerConfig: () => Effect.fail(new CustomerConfigError({ message: "boom" })),
      replaceCustomerConfig: () => Effect.fail(new CustomerConfigError({ message: "boom" })),
      getCustomerConfigValue: () => Effect.fail(new CustomerConfigError({ message: "boom" })),
      setCustomerConfigValue: () => Effect.fail(new CustomerConfigError({ message: "boom" })),
      deleteCustomerConfigValue: () => Effect.fail(new CustomerConfigError({ message: "boom" })),
    })

    const program = Effect.gen(function* () {
      const svc = yield* CustomerConfig
      return yield* svc.getCustomerConfig("user-1")
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(FailingCustomerConfig), Effect.either)
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CustomerConfigError)
    }
  })
})
