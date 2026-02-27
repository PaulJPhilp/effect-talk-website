/**
 * Utility functions for syncing pattern bookmarks between localStorage (guest) and DB (logged-in).
 */

const BOOKMARKS_STORAGE_KEY = "pattern_bookmarks"

/**
 * Get bookmarked pattern IDs from localStorage.
 */
export function getLocalStorageBookmarks(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as string[]
  } catch {
    return []
  }
}

/**
 * Add a pattern ID to bookmarks in localStorage.
 */
export function setLocalStorageBookmark(patternId: string): void {
  if (typeof window === "undefined") return
  try {
    const current = getLocalStorageBookmarks()
    if (!current.includes(patternId)) {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify([...current, patternId]))
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Remove a pattern ID from bookmarks in localStorage.
 */
export function removeLocalStorageBookmark(patternId: string): void {
  if (typeof window === "undefined") return
  try {
    const current = getLocalStorageBookmarks()
    const next = current.filter((id) => id !== patternId)
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore errors
  }
}

/**
 * Fetch all bookmarked pattern IDs from the API (authenticated users only).
 */
export async function fetchBookmarksFromAPI(): Promise<string[]> {
  const response = await fetch("/api/bookmarks", { method: "GET" })
  if (!response.ok) return []
  const payload = await response.json()
  return payload.bookmarks ?? []
}

/**
 * Add a bookmark via the API.
 */
export async function addBookmarkAPI(patternId: string): Promise<void> {
  await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patternId }),
  })
}

/**
 * Remove a bookmark via the API.
 */
export async function removeBookmarkAPI(patternId: string): Promise<void> {
  await fetch(`/api/bookmarks/${encodeURIComponent(patternId)}`, {
    method: "DELETE",
  })
}

/**
 * Sync localStorage bookmarks to DB (called when guest signs in).
 *
 * localStorage is intentionally kept after a successful sync.  The sync
 * endpoint uses upsert so re-syncing identical data is harmless, and
 * keeping localStorage ensures bookmarks survive page refreshes even if
 * the DB write silently failed.
 */
export async function syncBookmarksToDB(): Promise<void> {
  const localBookmarks = getLocalStorageBookmarks()
  if (localBookmarks.length === 0) return

  try {
    await fetch("/api/bookmarks/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patternIds: localBookmarks }),
    })
  } catch (error) {
    console.error("Failed to sync bookmarks:", error)
  }
}
