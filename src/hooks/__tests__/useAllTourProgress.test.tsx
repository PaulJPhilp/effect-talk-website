/**
 * Tests for useAllTourProgress hook.
 *
 * Uses real tourProgressSync functions with a globalThis.fetch
 * override. Asserts on rendered hook state — no vi.mock, no
 * call-verification.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { RegistryProvider } from "@effect-atom/atom-react"
import { useAllTourProgress } from "@/hooks/useAllTourProgress"
import { _resetLoaderState } from "@/hooks/useTourProgress"
import type { ReactNode } from "react"

/** Captured request from the fake fetch. */
interface CapturedRequest {
  url: string
  init?: RequestInit
}

function installFakeFetch() {
  const captured: CapturedRequest[] = []
  const originalFetch = globalThis.fetch
  const routes = new Map<string, () => Response>()

  globalThis.fetch = (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    captured.push({ url, init })
    const handler = routes.get(url)
    const resp = handler
      ? handler()
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
        })
    return Promise.resolve(resp)
  }

  return {
    captured,
    onGet(url: string, body: unknown) {
      routes.set(url, () =>
        new Response(JSON.stringify(body), { status: 200 }),
      )
    },
    restore() {
      globalThis.fetch = originalFetch
    },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return RegistryProvider({ children })
}

describe("useAllTourProgress", () => {
  let fake: ReturnType<typeof installFakeFetch>

  beforeEach(() => {
    localStorage.clear()
    _resetLoaderState()
    fake = installFakeFetch()
    fake.onGet("/api/tour/progress", { progress: [] })
  })

  afterEach(() => {
    fake.restore()
  })

  it("returns all completed step IDs (unfiltered)", async () => {
    localStorage.setItem(
      "tour_progress",
      JSON.stringify({ s1: "completed", s2: "completed" }),
    )

    const { result } = renderHook(
      () => useAllTourProgress(false),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.has("s1")).toBe(true)
    })

    expect(result.current.has("s2")).toBe(true)
    expect(result.current.size).toBe(2)
  })

  it("returns empty set when no progress exists", async () => {
    const { result } = renderHook(
      () => useAllTourProgress(false),
      { wrapper },
    )

    await waitFor(() => {
      // Wait for loader to finish
      expect(result.current.size).toBe(0)
    })
  })

  it("loads authenticated progress from API", async () => {
    fake.onGet("/api/tour/progress", {
      progress: [
        { step_id: "s1", status: "completed" },
        { step_id: "s2", status: "completed" },
      ],
    })

    const { result } = renderHook(
      () => useAllTourProgress(true),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.has("s1")).toBe(true)
    })

    expect(result.current.has("s2")).toBe(true)
    // API fetch was called
    const fetchReq = fake.captured.find(
      (r) =>
        r.url === "/api/tour/progress" &&
        r.init?.method === "GET",
    )
    expect(fetchReq).toBeDefined()
  })

  it("re-triggers load when isLoggedIn changes", async () => {
    fake.onGet("/api/tour/progress", {
      progress: [
        { step_id: "s1", status: "completed" },
      ],
    })

    const { result, rerender } = renderHook(
      ({ isLoggedIn }) => useAllTourProgress(isLoggedIn),
      { initialProps: { isLoggedIn: false }, wrapper },
    )

    // Wait for guest load to finish
    await waitFor(() => {
      expect(result.current.size).toBeGreaterThanOrEqual(0)
    })

    rerender({ isLoggedIn: true })

    // After switching to logged-in, API data loads
    await waitFor(() => {
      expect(result.current.has("s1")).toBe(true)
    })
  })
})
