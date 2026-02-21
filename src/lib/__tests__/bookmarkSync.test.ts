/**
 * Tests for bookmarkSync — localStorage and fetch functions.
 *
 * localStorage tests use the real happy-dom localStorage.
 * Fetch tests override globalThis.fetch with a recording fake
 * and assert on outcomes (return values, localStorage state,
 * captured request data). No vi.spyOn or call-verification.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  getLocalStorageBookmarks,
  setLocalStorageBookmark,
  removeLocalStorageBookmark,
  syncBookmarksToDB,
  fetchBookmarksFromAPI,
  addBookmarkAPI,
  removeBookmarkAPI,
} from "@/lib/bookmarkSync"

/** Captured request from the fake fetch. */
interface CapturedRequest {
  url: string
  init?: RequestInit
}

/**
 * Replace globalThis.fetch with a fake that records calls and
 * returns a configurable response. Returns a handle to inspect
 * captured requests and swap the response mid-test.
 */
function installFakeFetch(
  response: Response = new Response(
    JSON.stringify({ ok: true }),
    { status: 200 },
  ),
) {
  const captured: CapturedRequest[] = []
  const originalFetch = globalThis.fetch
  let currentResponse = response
  let shouldReject = false
  let rejectError: Error | null = null

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
      return Promise.reject(rejectError ?? new Error("fetch error"))
    }
    // Clone response so each call gets a fresh body
    return Promise.resolve(currentResponse.clone())
  }

  return {
    captured,
    setResponse(r: Response) {
      currentResponse = r
    },
    setReject(err: Error) {
      shouldReject = true
      rejectError = err
    },
    restore() {
      globalThis.fetch = originalFetch
    },
  }
}

describe("bookmarkSync", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── localStorage tests (already compliant) ──────────────

  describe("getLocalStorageBookmarks", () => {
    it("returns empty array when nothing stored", () => {
      expect(getLocalStorageBookmarks()).toEqual([])
    })

    it("returns parsed bookmarks from localStorage", () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1", "p2"]),
      )
      expect(getLocalStorageBookmarks()).toEqual(["p1", "p2"])
    })

    it("returns empty array on invalid JSON", () => {
      localStorage.setItem("pattern_bookmarks", "not-json")
      expect(getLocalStorageBookmarks()).toEqual([])
    })
  })

  describe("setLocalStorageBookmark", () => {
    it("adds a pattern ID to bookmarks", () => {
      setLocalStorageBookmark("p1")
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toEqual(["p1"])
    })

    it("preserves existing bookmarks", () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )
      setLocalStorageBookmark("p2")
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toEqual(["p1", "p2"])
    })

    it("does not duplicate an existing bookmark", () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )
      setLocalStorageBookmark("p1")
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toEqual(["p1"])
    })
  })

  describe("removeLocalStorageBookmark", () => {
    it("removes a pattern ID from bookmarks", () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1", "p2"]),
      )
      removeLocalStorageBookmark("p1")
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toEqual(["p2"])
    })

    it("does not throw when pattern not in bookmarks", () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )
      expect(() => removeLocalStorageBookmark("p2")).not.toThrow()
      const stored = JSON.parse(
        localStorage.getItem("pattern_bookmarks")!,
      )
      expect(stored).toEqual(["p1"])
    })
  })

  // ── Fetch tests (rewritten — no spies) ──────────────────

  describe("syncBookmarksToDB", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch()
    })
    afterEach(() => {
      fake.restore()
    })

    it("does nothing when localStorage is empty", async () => {
      await syncBookmarksToDB()
      expect(fake.captured).toHaveLength(0)
    })

    it("sends localStorage bookmarks to sync endpoint", async () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1", "p2"]),
      )

      await syncBookmarksToDB()

      expect(fake.captured).toHaveLength(1)
      expect(fake.captured[0].url).toBe("/api/bookmarks/sync")
      expect(fake.captured[0].init?.method).toBe("POST")
      const body = JSON.parse(fake.captured[0].init?.body as string)
      expect(body).toEqual({ patternIds: ["p1", "p2"] })
    })

    it("keeps localStorage after successful sync", async () => {
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )

      await syncBookmarksToDB()

      expect(localStorage.getItem("pattern_bookmarks")).not.toBeNull()
    })

    it("keeps localStorage when fetch throws", async () => {
      fake.setReject(new Error("Network error"))
      localStorage.setItem(
        "pattern_bookmarks",
        JSON.stringify(["p1"]),
      )

      await syncBookmarksToDB()

      expect(localStorage.getItem("pattern_bookmarks")).not.toBeNull()
    })
  })

  describe("fetchBookmarksFromAPI", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch(
        new Response(JSON.stringify({ bookmarks: [] }), {
          status: 200,
        }),
      )
    })
    afterEach(() => {
      fake.restore()
    })

    it("fetches bookmarks from the API", async () => {
      fake.setResponse(
        new Response(
          JSON.stringify({ bookmarks: ["p1", "p2"] }),
          { status: 200 },
        ),
      )

      const result = await fetchBookmarksFromAPI()

      expect(fake.captured[0].url).toBe("/api/bookmarks")
      expect(fake.captured[0].init?.method).toBe("GET")
      expect(result).toEqual(["p1", "p2"])
    })

    it("returns empty array on non-OK response", async () => {
      fake.setResponse(
        new Response("Unauthorized", { status: 401 }),
      )

      const result = await fetchBookmarksFromAPI()
      expect(result).toEqual([])
    })

    it("returns empty array when no bookmarks field", async () => {
      fake.setResponse(
        new Response(JSON.stringify({}), { status: 200 }),
      )

      const result = await fetchBookmarksFromAPI()
      expect(result).toEqual([])
    })
  })

  describe("addBookmarkAPI", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch()
    })
    afterEach(() => {
      fake.restore()
    })

    it("sends POST to API with pattern ID", async () => {
      await addBookmarkAPI("p1")

      expect(fake.captured).toHaveLength(1)
      expect(fake.captured[0].url).toBe("/api/bookmarks")
      expect(fake.captured[0].init?.method).toBe("POST")
      const body = JSON.parse(fake.captured[0].init?.body as string)
      expect(body).toEqual({ patternId: "p1" })
    })
  })

  describe("removeBookmarkAPI", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch()
    })
    afterEach(() => {
      fake.restore()
    })

    it("sends DELETE to API with pattern ID", async () => {
      await removeBookmarkAPI("p1")

      expect(fake.captured).toHaveLength(1)
      expect(fake.captured[0].url).toBe("/api/bookmarks/p1")
      expect(fake.captured[0].init?.method).toBe("DELETE")
    })
  })
})
