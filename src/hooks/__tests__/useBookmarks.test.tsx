/**
 * Tests for useBookmarks hook.
 *
 * Uses real bookmarkSync functions with a globalThis.fetch
 * override. Asserts on rendered hook state and localStorage
 * outcomes — no vi.mock, no call-verification.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { RegistryProvider } from "@effect-atom/atom-react"
import {
  useBookmarks,
  _resetBookmarkLoaderState,
} from "@/hooks/useBookmarks"
import type { ReactNode } from "react"

/** Captured request from the fake fetch. */
interface CapturedRequest {
  url: string
  init?: RequestInit
}

/**
 * Replace globalThis.fetch with a fake that records calls and
 * returns a configurable per-URL response.
 */
function installFakeFetch() {
  const captured: CapturedRequest[] = []
  const originalFetch = globalThis.fetch
  const routes = new Map<string, () => Response>()
  const defaultResponse = () =>
    new Response(JSON.stringify({ ok: true }), { status: 200 })
  let shouldReject = false

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
    if (shouldReject) {
      return Promise.reject(new Error("Network error"))
    }
    const handler = routes.get(url)
    const resp = handler ? handler() : defaultResponse()
    return Promise.resolve(resp)
  }

  return {
    captured,
    onGet(url: string, body: unknown) {
      routes.set(url, () =>
        new Response(JSON.stringify(body), { status: 200 }),
      )
    },
    setReject() {
      shouldReject = true
    },
    restore() {
      globalThis.fetch = originalFetch
    },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return RegistryProvider({ children })
}

describe("useBookmarks", () => {
  let fake: ReturnType<typeof installFakeFetch>

  beforeEach(() => {
    localStorage.clear()
    _resetBookmarkLoaderState()
    fake = installFakeFetch()
    // Default: API returns empty bookmarks
    fake.onGet("/api/bookmarks", { bookmarks: [] })
  })

  afterEach(() => {
    fake.restore()
  })

  it("starts with empty bookmarkedIds and transitions isLoading to false", async () => {
    const { result } = renderHook(
      () => useBookmarks(false),
      { wrapper },
    )
    expect(result.current.bookmarkedIds.size).toBe(0)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("loads guest bookmarks from localStorage", async () => {
    localStorage.setItem(
      "pattern_bookmarks",
      JSON.stringify(["p1", "p2"]),
    )

    const { result } = renderHook(
      () => useBookmarks(false),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.bookmarkedIds.has("p1")).toBe(true)
    expect(result.current.bookmarkedIds.has("p2")).toBe(true)
  })

  it("loads authenticated bookmarks from API and merges with localStorage", async () => {
    localStorage.setItem(
      "pattern_bookmarks",
      JSON.stringify(["p1"]),
    )
    fake.onGet("/api/bookmarks", { bookmarks: ["p2", "p3"] })

    const { result } = renderHook(
      () => useBookmarks(true),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // localStorage bookmark preserved
    expect(result.current.bookmarkedIds.has("p1")).toBe(true)
    // API bookmarks merged
    expect(result.current.bookmarkedIds.has("p2")).toBe(true)
    expect(result.current.bookmarkedIds.has("p3")).toBe(true)
    // Sync was called (check captured requests)
    const syncReq = fake.captured.find(
      (r) => r.url === "/api/bookmarks/sync",
    )
    expect(syncReq).toBeDefined()
  })

  describe("toggleBookmark", () => {
    it("adds bookmark and persists to localStorage for guest", async () => {
      const { result } = renderHook(
        () => useBookmarks(false),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleBookmark("p1")
      })

      // Hook state updated
      expect(result.current.bookmarkedIds.has("p1")).toBe(true)
      // localStorage updated
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toContain("p1")
      // No API call made (guest)
      const apiReq = fake.captured.find(
        (r) => r.url === "/api/bookmarks" && r.init?.method === "POST",
      )
      expect(apiReq).toBeUndefined()
    })

    it("removes bookmark when already bookmarked", async () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )

      const { result } = renderHook(
        () => useBookmarks(false),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.bookmarkedIds.has("p1")).toBe(true)
      })

      act(() => {
        result.current.toggleBookmark("p1")
      })

      expect(result.current.bookmarkedIds.has("p1")).toBe(false)
      // localStorage updated
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).not.toContain("p1")
    })

    it("also persists to DB for logged-in user (add)", async () => {
      fake.onGet("/api/bookmarks", { bookmarks: [] })

      const { result } = renderHook(
        () => useBookmarks(true),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.toggleBookmark("p1")
      })

      // localStorage updated
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toContain("p1")

      // Wait for fire-and-forget API call
      await waitFor(() => {
        const addReq = fake.captured.find(
          (r) =>
            r.url === "/api/bookmarks" &&
            r.init?.method === "POST",
        )
        expect(addReq).toBeDefined()
      })
    })

    it("also calls remove API for logged-in user", async () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )
      fake.onGet("/api/bookmarks", { bookmarks: ["p1"] })

      const { result } = renderHook(
        () => useBookmarks(true),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.bookmarkedIds.has("p1")).toBe(true)
      })

      act(() => {
        result.current.toggleBookmark("p1")
      })

      expect(result.current.bookmarkedIds.has("p1")).toBe(false)

      // Wait for fire-and-forget API call
      await waitFor(() => {
        const delReq = fake.captured.find(
          (r) =>
            r.url === "/api/bookmarks/p1" &&
            r.init?.method === "DELETE",
        )
        expect(delReq).toBeDefined()
      })
    })
  })

  it("preserves data when API fetch fails", async () => {
    localStorage.setItem(
      "pattern_bookmarks",
      JSON.stringify(["p1"]),
    )
    fake.setReject()

    const { result } = renderHook(
      () => useBookmarks(true),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // localStorage data preserved despite API failure
    expect(result.current.bookmarkedIds.has("p1")).toBe(true)
  })
})
