import { render, screen } from "@testing-library/react"
import { describe, expect, it, beforeEach, vi } from "vitest"

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

const authState = {
  currentUser: null as null | { id: string },
  workOSConfigured: true,
}

const getSignInUrlMock = vi.fn(async ({ state }: { state?: string }) => {
  const url = new URL("https://auth.example/sign-in")
  if (state) {
    url.searchParams.set("state", state)
  }
  return url.toString()
})

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      host: "localhost:3000",
      "x-forwarded-proto": "http",
    }),
}))

vi.mock("@workos-inc/authkit-nextjs", () => ({
  getSignInUrl: getSignInUrlMock,
}))

vi.mock("@/services/Auth", () => ({
  getCurrentUser: async () => authState.currentUser,
  isWorkOSConfigured: () => authState.workOSConfigured,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("lucide-react", () => ({
  AlertCircle: () => <span aria-hidden="true" />,
}))

describe("SignInPage", () => {
  beforeEach(() => {
    authState.currentUser = null
    authState.workOSConfigured = true
    getSignInUrlMock.mockClear()
    redirectMock.mockClear()
  })

  it("includes a safe returnTo in the AuthKit state", async () => {
    const { default: SignInPage } = await import("@/app/auth/sign-in/page")
    const result = await SignInPage({
      searchParams: Promise.resolve({ returnTo: "/tour/pipes-and-flow?mode=compare&step=2" }),
    })

    render(result)

    const link = screen.getByRole("link", { name: /continue with github/i })
    const href = link.getAttribute("href")

    expect(href).toBeTruthy()
    const state = new URL(href!).searchParams.get("state")
    expect(state).toBeTruthy()
    expect(JSON.parse(atob(state!))).toEqual({
      returnPathname: "/tour/pipes-and-flow?mode=compare&step=2",
    })
  })

  it("omits AuthKit state for unsafe returnTo values", async () => {
    const { default: SignInPage } = await import("@/app/auth/sign-in/page")
    const result = await SignInPage({
      searchParams: Promise.resolve({ returnTo: "https://example.com/tour" }),
    })

    render(result)

    const link = screen.getByRole("link", { name: /continue with github/i })
    const href = link.getAttribute("href")

    expect(new URL(href!).searchParams.get("state")).toBeNull()
  })

  it("redirects logged-in users to the safe returnTo", async () => {
    authState.currentUser = { id: "user-123" }
    const { default: SignInPage } = await import("@/app/auth/sign-in/page")

    await expect(
      SignInPage({
        searchParams: Promise.resolve({ returnTo: "/tour?mode=v4" }),
      })
    ).rejects.toThrow("REDIRECT:/tour?mode=v4")
  })
})
