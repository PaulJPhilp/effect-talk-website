import { Effect } from "effect"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { silenceConsole } from "@/test/console"

const getCurrentUserMock = vi.fn()
const replaceCustomerConfigMock = vi.fn()

vi.mock("@/services/Auth", () => ({
  getCurrentUser: getCurrentUserMock,
}))

vi.mock("@/services/CustomerConfig", () => ({
  replaceCustomerConfig: replaceCustomerConfigMock,
}))

function buildRequest(body: BodyInit | null, contentType = "application/json"): NextRequest {
  return new NextRequest("http://localhost:3000/api/preferences", {
    method: "POST",
    headers: {
      "Content-Type": contentType,
    },
    body,
  })
}

describe("POST /api/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects unauthenticated requests", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/preferences/route")

    const response = await POST(
      buildRequest(JSON.stringify({ preferences: { theme: "dark" } }))
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Unauthorized" })
  })

  it("rejects invalid JSON", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "user-123" })
    const { POST } = await import("@/app/api/preferences/route")

    const response = await POST(buildRequest("{"))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid JSON" })
  })

  it("rejects invalid schema", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "user-123" })
    const { POST } = await import("@/app/api/preferences/route")

    const response = await POST(buildRequest(JSON.stringify({ nope: true })))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Validation failed")
    expect(body.details).toBeTruthy()
  })

  it("returns updated preferences on success", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "user-123" })
    replaceCustomerConfigMock.mockReturnValueOnce(
      Effect.succeed({ theme: "light", notifications: true })
    )
    const { POST } = await import("@/app/api/preferences/route")

    const response = await POST(
      buildRequest(JSON.stringify({ preferences: { theme: "light", notifications: true } }))
    )

    expect(replaceCustomerConfigMock).toHaveBeenCalledWith("user-123", {
      theme: "light",
      notifications: true,
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      preferences: { theme: "light", notifications: true },
    })
  })

  it("returns 500 when an unexpected error escapes", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: "user-123" })
    replaceCustomerConfigMock.mockImplementationOnce(() => {
      throw new Error("unexpected")
    })
    const restoreConsole = silenceConsole("error")

    try {
      const { POST } = await import("@/app/api/preferences/route")
      const response = await POST(
        buildRequest(JSON.stringify({ preferences: { theme: "light" } }))
      )

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: "Internal error" })
    } finally {
      restoreConsole()
    }
  })
})
