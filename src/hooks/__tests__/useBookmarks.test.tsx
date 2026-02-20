import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { RegistryProvider } from "@effect-atom/atom-react"
import { useBookmarks, _resetBookmarkLoaderState } from "@/hooks/useBookmarks"
import type { ReactNode } from "react"

// Mock the sync module
const mockGetLocalStorageBookmarks = vi.fn(() => [] as string[])
const mockSetLocalStorageBookmark = vi.fn()
const mockRemoveLocalStorageBookmark = vi.fn()
const mockSyncBookmarksToDB = vi.fn(async () => {})
const mockFetchBookmarksFromAPI = vi.fn(async () => [] as string[])
const mockAddBookmarkAPI = vi.fn(async () => {})
const mockRemoveBookmarkAPI = vi.fn(async () => {})

vi.mock("@/lib/bookmarkSync", () => ({
  getLocalStorageBookmarks: (...args: unknown[]) => mockGetLocalStorageBookmarks(...args),
  setLocalStorageBookmark: (...args: unknown[]) => mockSetLocalStorageBookmark(...args),
  removeLocalStorageBookmark: (...args: unknown[]) => mockRemoveLocalStorageBookmark(...args),
  syncBookmarksToDB: (...args: unknown[]) => mockSyncBookmarksToDB(...args),
  fetchBookmarksFromAPI: (...args: unknown[]) => mockFetchBookmarksFromAPI(...args),
  addBookmarkAPI: (...args: unknown[]) => mockAddBookmarkAPI(...args),
  removeBookmarkAPI: (...args: unknown[]) => mockRemoveBookmarkAPI(...args),
}))

/** Wrapper that provides an isolated atom registry per test. */
function wrapper({ children }: { children: ReactNode }) {
  return RegistryProvider({ children })
}

describe("useBookmarks", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetLocalStorageBookmarks.mockReturnValue([])
    mockSyncBookmarksToDB.mockResolvedValue(undefined)
    mockFetchBookmarksFromAPI.mockResolvedValue([])
    mockAddBookmarkAPI.mockResolvedValue(undefined)
    mockRemoveBookmarkAPI.mockResolvedValue(undefined)
    _resetBookmarkLoaderState()
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
    mockGetLocalStorageBookmarks.mockReturnValue(["p1", "p2"])

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
    mockGetLocalStorageBookmarks.mockReturnValue(["p1"])
    mockFetchBookmarksFromAPI.mockResolvedValue(["p2", "p3"])

    const { result } = renderHook(
      () => useBookmarks(true),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.bookmarkedIds.has("p1")).toBe(true)  // from localStorage
    expect(result.current.bookmarkedIds.has("p2")).toBe(true)  // from API
    expect(result.current.bookmarkedIds.has("p3")).toBe(true)  // from API
    expect(mockSyncBookmarksToDB).toHaveBeenCalled()
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

      expect(result.current.bookmarkedIds.has("p1")).toBe(true)
      expect(mockSetLocalStorageBookmark).toHaveBeenCalledWith("p1")
      expect(mockAddBookmarkAPI).not.toHaveBeenCalled()
    })

    it("removes bookmark when already bookmarked", async () => {
      mockGetLocalStorageBookmarks.mockReturnValue(["p1"])

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
      expect(mockRemoveLocalStorageBookmark).toHaveBeenCalledWith("p1")
    })

    it("also persists to DB for logged-in user (add)", async () => {
      mockFetchBookmarksFromAPI.mockResolvedValue([])

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

      expect(mockSetLocalStorageBookmark).toHaveBeenCalledWith("p1")
      expect(mockAddBookmarkAPI).toHaveBeenCalledWith("p1")
    })

    it("also calls remove API for logged-in user (remove)", async () => {
      mockGetLocalStorageBookmarks.mockReturnValue(["p1"])
      mockFetchBookmarksFromAPI.mockResolvedValue(["p1"])

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

      expect(mockRemoveLocalStorageBookmark).toHaveBeenCalledWith("p1")
      expect(mockRemoveBookmarkAPI).toHaveBeenCalledWith("p1")
    })
  })

  it("preserves data when API fetch fails", async () => {
    mockGetLocalStorageBookmarks.mockReturnValue(["p1"])
    mockFetchBookmarksFromAPI.mockRejectedValue(new Error("Network error"))

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
