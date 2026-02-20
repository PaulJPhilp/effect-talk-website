import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getLocalStorageBookmarks,
  setLocalStorageBookmark,
  removeLocalStorageBookmark,
  syncBookmarksToDB,
  fetchBookmarksFromAPI,
  addBookmarkAPI,
  removeBookmarkAPI,
} from "@/lib/bookmarkSync"

describe("bookmarkSync", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("getLocalStorageBookmarks", () => {
    it("returns empty array when nothing stored", () => {
      expect(getLocalStorageBookmarks()).toEqual([])
    })

    it("returns parsed bookmarks from localStorage", () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1", "p2"]))
      expect(getLocalStorageBookmarks()).toEqual(["p1", "p2"])
    })

    it("returns empty array when localStorage contains invalid JSON", () => {
      localStorage.setItem("pattern_bookmarks", "not-json")
      expect(getLocalStorageBookmarks()).toEqual([])
    })
  })

  describe("setLocalStorageBookmark", () => {
    it("adds a pattern ID to bookmarks", () => {
      setLocalStorageBookmark("p1")
      const stored = JSON.parse(localStorage.getItem("pattern_bookmarks")!)
      expect(stored).toEqual(["p1"])
    })

    it("preserves existing bookmarks", () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1"]))
      setLocalStorageBookmark("p2")
      const stored = JSON.parse(localStorage.getItem("pattern_bookmarks")!)
      expect(stored).toEqual(["p1", "p2"])
    })

    it("does not duplicate an existing bookmark", () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1"]))
      setLocalStorageBookmark("p1")
      const stored = JSON.parse(localStorage.getItem("pattern_bookmarks")!)
      expect(stored).toEqual(["p1"])
    })
  })

  describe("removeLocalStorageBookmark", () => {
    it("removes a pattern ID from bookmarks", () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1", "p2"]))
      removeLocalStorageBookmark("p1")
      const stored = JSON.parse(localStorage.getItem("pattern_bookmarks")!)
      expect(stored).toEqual(["p2"])
    })

    it("does not throw when pattern not in bookmarks", () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1"]))
      expect(() => removeLocalStorageBookmark("p2")).not.toThrow()
      const stored = JSON.parse(localStorage.getItem("pattern_bookmarks")!)
      expect(stored).toEqual(["p1"])
    })
  })

  describe("syncBookmarksToDB", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("does nothing when localStorage is empty", async () => {
      await syncBookmarksToDB()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("sends localStorage bookmarks to sync endpoint", async () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1", "p2"]))

      await syncBookmarksToDB()

      expect(fetchSpy).toHaveBeenCalledWith("/api/bookmarks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternIds: ["p1", "p2"] }),
      })
    })

    it("keeps localStorage after successful sync", async () => {
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1"]))

      await syncBookmarksToDB()

      expect(localStorage.getItem("pattern_bookmarks")).not.toBeNull()
    })

    it("keeps localStorage when fetch throws", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"))
      localStorage.setItem("pattern_bookmarks", JSON.stringify(["p1"]))

      await syncBookmarksToDB()

      expect(localStorage.getItem("pattern_bookmarks")).not.toBeNull()
    })
  })

  describe("fetchBookmarksFromAPI", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ bookmarks: [] }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("fetches bookmarks from the API", async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ bookmarks: ["p1", "p2"] }), { status: 200 })
      )

      const result = await fetchBookmarksFromAPI()

      expect(fetchSpy).toHaveBeenCalledWith("/api/bookmarks", { method: "GET" })
      expect(result).toEqual(["p1", "p2"])
    })

    it("returns empty array on non-OK response", async () => {
      fetchSpy.mockResolvedValue(new Response("Unauthorized", { status: 401 }))

      const result = await fetchBookmarksFromAPI()
      expect(result).toEqual([])
    })

    it("returns empty array when response has no bookmarks field", async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      const result = await fetchBookmarksFromAPI()
      expect(result).toEqual([])
    })
  })

  describe("addBookmarkAPI", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("sends POST to API with pattern ID", async () => {
      await addBookmarkAPI("p1")

      expect(fetchSpy).toHaveBeenCalledWith("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId: "p1" }),
      })
    })
  })

  describe("removeBookmarkAPI", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("sends DELETE to API with pattern ID", async () => {
      await removeBookmarkAPI("p1")

      expect(fetchSpy).toHaveBeenCalledWith("/api/bookmarks/p1", {
        method: "DELETE",
      })
    })
  })
})
