import { describe, expect, it, beforeEach, vi } from "vitest"
import { NextResponse } from "next/server"

const handleAuthMock = vi.fn((options: { returnPathname?: string }) => {
  return async function GET(request: Request) {
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
  upsertUser: async () => ({
    id: "user-123",
  }),
}))

vi.mock("@/services/Auth", () => ({
  setSessionCookie: async () => {},
}))

describe("GET /auth/callback", () => {
  beforeEach(() => {
    handleAuthMock.mockClear()
  })

  it("defaults to /settings when no state return path is provided", async () => {
    const { GET } = await import("@/app/auth/callback/route")
    const response = await GET(new Request("http://localhost:3000/auth/callback?code=test"))

    expect(handleAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ returnPathname: "/settings" })
    )
    expect(response.headers.get("location")).toBe("http://localhost:3000/settings")
  })

  it("honors the state-provided return path", async () => {
    const { GET } = await import("@/app/auth/callback/route")
    const state = btoa(JSON.stringify({ returnPathname: "/tour/pipes-and-flow?mode=compare&step=2" }))
    const response = await GET(
      new Request(`http://localhost:3000/auth/callback?code=test&state=${encodeURIComponent(state)}`)
    )

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/tour/pipes-and-flow?mode=compare&step=2"
    )
  })
})
