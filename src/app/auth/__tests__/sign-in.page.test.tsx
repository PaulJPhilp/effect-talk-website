import { render, screen } from "@testing-library/react"
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

const headersState = {
  current: new Headers({
    host: "localhost:3000",
    "x-forwarded-proto": "http",
  }),
}

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

const authState = {
  currentUser: null as null | { id: string },
  workOSConfigured: true,
}

const getSignInUrlMock = vi.fn(async ({ state, redirectUri }: { state?: string; redirectUri?: string }) => {
  const url = new URL("https://auth.example/sign-in")
  if (state) {
    url.searchParams.set("state", state)
  }
  if (redirectUri) {
    url.searchParams.set("redirect_uri", redirectUri)
  }
  return url.toString()
})

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

vi.mock("next/headers", () => ({
  headers: async () => headersState.current,
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
    headersState.current = new Headers({
      host: "localhost:3000",
      "x-forwarded-proto": "http",
    })
    delete process.env.APP_BASE_URL
    delete process.env.VERCEL_ENV
  })

  afterEach(() => {
    delete process.env.APP_BASE_URL
    delete process.env.WORKOS_REDIRECT_URI
    delete process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
    delete process.env.VERCEL_ENV
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

  it("redirects logged-in users to /settings when returnTo is unsafe", async () => {
    authState.currentUser = { id: "user-123" }
    const { default: SignInPage } = await import("@/app/auth/sign-in/page")

    await expect(
      SignInPage({
        searchParams: Promise.resolve({ returnTo: "https://evil.example" }),
      })
    ).rejects.toThrow("REDIRECT:/settings")
  })

  it("renders the auth_failed error details", async () => {
    const { default: SignInPage } = await import("@/app/auth/sign-in/page")
    const result = await SignInPage({
      searchParams: Promise.resolve({ error: "auth_failed", details: "Failure details" }),
    })

    render(result)

    expect(screen.getByText(/authentication failed/i)).toBeInTheDocument()
    expect(screen.getByText("Failure details")).toBeInTheDocument()
  })

  it("renders the WorkOS configuration alert and disables auth when not configured", async () => {
    authState.workOSConfigured = false
    const { default: SignInPage } = await import("@/app/auth/sign-in/page")
    const result = await SignInPage({
      searchParams: Promise.resolve({}),
    })

    render(result)

    expect(screen.getByText(/workos authkit is not configured/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /continue with github/i })).toHaveAttribute("href", "#")
  })

  it("falls back to APP_BASE_URL when forwarded host headers are missing", async () => {
    headersState.current = new Headers()
    process.env.APP_BASE_URL = "https://effecttalk.dev"

    const { default: SignInPage } = await import("@/app/auth/sign-in/page")
    const result = await SignInPage({
      searchParams: Promise.resolve({}),
    })

    render(result)

    const href = screen.getByRole("link", { name: /continue with github/i }).getAttribute("href")
    expect(new URL(href!).searchParams.get("redirect_uri")).toBe("https://effecttalk.dev/auth/callback")
  })

  it("uses the configured redirect URI in deployed environments instead of the request host", async () => {
    process.env.VERCEL_ENV = "preview"
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = "https://staging-effecttalk.vercel.app/auth/callback"
    headersState.current = new Headers({
      host: "effect-talk-website-aqgpw6htu-buddybuilder.vercel.app",
      "x-forwarded-host": "effect-talk-website-aqgpw6htu-buddybuilder.vercel.app",
      "x-forwarded-proto": "https",
    })

    const { default: SignInPage } = await import("@/app/auth/sign-in/page")
    const result = await SignInPage({
      searchParams: Promise.resolve({}),
    })

    render(result)

    const href = screen.getByRole("link", { name: /continue with github/i }).getAttribute("href")
    expect(new URL(href!).searchParams.get("redirect_uri")).toBe(
      "https://staging-effecttalk.vercel.app/auth/callback"
    )
  })
})
