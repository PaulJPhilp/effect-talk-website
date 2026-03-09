import { describe, expect, it, beforeEach, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { silenceConsole } from "@/test/console"

const upsertUserMock = vi.fn(() => Effect.succeed({ id: "user-123" }))
const setSessionCookieMock = vi.fn(async () => {})

const handleAuthMock = vi.fn((options: {
  returnPathname?: string
  onSuccess?: (params: {
    user: {
      id: string
      email: string
      firstName?: string | null
      lastName?: string | null
      profilePictureUrl?: string | null
    }
  }) => Promise<void>
  onError?: (params: { error?: Error; request: NextRequest }) => Promise<NextResponse>
}) => {
  return async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const state = url.searchParams.get("state")
    let returnPathname = options.returnPathname ?? "/"

    if (state) {
      const decoded = JSON.parse(atob(state)) as { returnPathname?: string }
      if (decoded.returnPathname) {
        returnPathname = decoded.returnPathname
      }
    }

    return NextResponse.redirect(new URL(returnPathname, url.origin))
  }
})

vi.mock("@workos-inc/authkit-nextjs", () => ({
  handleAuth: handleAuthMock,
}))

vi.mock("@/services/Db/api", () => ({
  upsertUser: upsertUserMock,
}))

vi.mock("@/services/Auth", () => ({
  setSessionCookie: setSessionCookieMock,
}))

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.resetModules()
    handleAuthMock.mockClear()
    upsertUserMock.mockClear()
    setSessionCookieMock.mockClear()
    upsertUserMock.mockReturnValue(Effect.succeed({ id: "user-123" }))
  })

  it("defaults to /settings when no state return path is provided", async () => {
    const { GET } = await import("@/app/auth/callback/route")
    const response = await GET(new NextRequest("http://localhost:3000/auth/callback?code=test"))

    expect(handleAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ returnPathname: "/settings" })
    )
    expect(response.headers.get("location")).toBe("http://localhost:3000/settings")
  })

  it("honors the state-provided return path", async () => {
    const { GET } = await import("@/app/auth/callback/route")
    const state = btoa(JSON.stringify({ returnPathname: "/tour/pipes-and-flow?mode=compare&step=2" }))
    const response = await GET(
      new NextRequest(`http://localhost:3000/auth/callback?code=test&state=${encodeURIComponent(state)}`)
    )

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/tour/pipes-and-flow?mode=compare&step=2"
    )
  })

  it("upserts the user and sets the session cookie in onSuccess", async () => {
    await import("@/app/auth/callback/route")
    const options = handleAuthMock.mock.calls[0]?.[0]
    expect(options?.onSuccess).toBeTypeOf("function")

    await options!.onSuccess!({
      user: {
        id: "workos-123",
        email: "user@example.com",
        firstName: "Test",
        lastName: "User",
        profilePictureUrl: "https://example.com/avatar.png",
      },
    })

    expect(upsertUserMock).toHaveBeenCalledWith({
      workosId: "workos-123",
      email: "user@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
    })
    expect(setSessionCookieMock).toHaveBeenCalledWith("user-123")
  })

  it("rethrows onSuccess errors after logging", async () => {
    upsertUserMock.mockReturnValueOnce(Effect.fail(new Error("db failure")) as never)
    const restoreConsole = silenceConsole("error")

    try {
      await import("@/app/auth/callback/route")
      const options = handleAuthMock.mock.calls[0]?.[0]
      expect(options?.onSuccess).toBeTypeOf("function")

      await expect(
        options!.onSuccess!({
          user: {
            id: "workos-123",
            email: "user@example.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null,
          },
        })
      ).rejects.toThrow("db failure")
    } finally {
      restoreConsole()
    }
  })

  it("redirects onError with the explicit error message", async () => {
    await import("@/app/auth/callback/route")
    const options = handleAuthMock.mock.calls[0]?.[0]
    const restoreConsole = silenceConsole("error")
    expect(options?.onError).toBeTypeOf("function")

    try {
      const response = await options!.onError!({
        error: new Error("Auth exploded"),
        request: new NextRequest("http://localhost:3000/auth/callback"),
      })

      expect(response.headers.get("location")).toContain(
        "/auth/sign-in?error=auth_failed&details=Auth+exploded"
      )
    } finally {
      restoreConsole()
    }
  })

  it("falls back to WorkOS error_description when error is absent", async () => {
    await import("@/app/auth/callback/route")
    const options = handleAuthMock.mock.calls[0]?.[0]
    const restoreConsole = silenceConsole("error")
    expect(options?.onError).toBeTypeOf("function")

    try {
      const response = await options!.onError!({
        error: undefined,
        request: new NextRequest(
          "http://localhost:3000/auth/callback?error_description=Denied"
        ),
      })

      expect(response.headers.get("location")).toContain(
        "/auth/sign-in?error=auth_failed&details=Denied"
      )
    } finally {
      restoreConsole()
    }
  })
})
