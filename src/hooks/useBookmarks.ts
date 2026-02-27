"use client"

import { useCallback, useEffect } from "react"
import { useAtom, useAtomValue } from "@effect-atom/atom-react"
import { bookmarkedPatternIdsAtom, bookmarksLoadedAtom } from "@/lib/bookmarkAtoms"
import {
  getLocalStorageBookmarks,
  setLocalStorageBookmark,
  removeLocalStorageBookmark,
  syncBookmarksToDB,
  fetchBookmarksFromAPI,
  addBookmarkAPI,
  removeBookmarkAPI,
} from "@/lib/bookmarkSync"

interface UseBookmarksResult {
  readonly bookmarkedIds: ReadonlySet<string>
  readonly toggleBookmark: (patternId: string) => void
  readonly isLoading: boolean
}

// Track which data sources have been loaded (module-scoped, not an atom,
// because this is control flow — not reactive state the UI renders).
const loadedSources = { guest: false, authenticated: false }
let loadPromise: Promise<void> | null = null

/**
 * Shared loader — loads bookmarks from localStorage and/or API into atoms.
 */
function useBookmarksLoader(isLoggedIn: boolean): void {
  const [, setBookmarkedIds] = useAtom(bookmarkedPatternIdsAtom)
  const [, setLoaded] = useAtom(bookmarksLoadedAtom)

  useEffect(() => {
    const source = isLoggedIn ? "authenticated" : "guest"
    if (loadedSources[source]) return

    // Dedup concurrent calls
    if (!loadPromise) {
      loadPromise = (async () => {
        // Always read localStorage first (works for both guest and auth)
        const fromLocal = getLocalStorageBookmarks()
        if (fromLocal.length > 0) {
          setBookmarkedIds((prev) => {
            const merged = new Set(prev)
            for (const id of fromLocal) merged.add(id)
            return merged
          })
        }
        loadedSources.guest = true

        if (isLoggedIn) {
          // Sync localStorage → DB (idempotent upsert)
          await syncBookmarksToDB()

          // Fetch canonical state from DB
          try {
            const fromDB = await fetchBookmarksFromAPI()
            if (fromDB.length > 0) {
              setBookmarkedIds((prev) => {
                const merged = new Set(prev)
                for (const id of fromDB) merged.add(id)
                return merged
              })
            }
          } catch {
            // Network error — localStorage data already in atom
          }
          loadedSources.authenticated = true
        }

        setLoaded(true)
      })().finally(() => {
        loadPromise = null
      })
    }
  }, [isLoggedIn, setBookmarkedIds, setLoaded])
}

/**
 * Reset loader state — for testing only.
 */
export function _resetBookmarkLoaderState(): void {
  loadedSources.guest = false
  loadedSources.authenticated = false
  loadPromise = null
}

export function useBookmarks(isLoggedIn: boolean): UseBookmarksResult {
  const [bookmarkedIds, setBookmarkedIds] = useAtom(bookmarkedPatternIdsAtom)
  const loaded = useAtomValue(bookmarksLoadedAtom)

  useBookmarksLoader(isLoggedIn)

  const toggleBookmark = useCallback(
    (patternId: string) => {
      const isCurrentlyBookmarked = bookmarkedIds.has(patternId)

      // 1. Update atom (immediate UI update)
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        if (isCurrentlyBookmarked) {
          next.delete(patternId)
        } else {
          next.add(patternId)
        }
        return next
      })

      // 2. Persist to localStorage (survives refresh)
      if (isCurrentlyBookmarked) {
        removeLocalStorageBookmark(patternId)
      } else {
        setLocalStorageBookmark(patternId)
      }

      // 3. Persist to DB if authenticated (fire-and-forget)
      if (isLoggedIn) {
        if (isCurrentlyBookmarked) {
          removeBookmarkAPI(patternId).catch((err) =>
            console.warn("Failed to remove bookmark from DB:", err)
          )
        } else {
          addBookmarkAPI(patternId).catch((err) =>
            console.warn("Failed to add bookmark to DB:", err)
          )
        }
      }
    },
    [isLoggedIn, bookmarkedIds, setBookmarkedIds],
  )

  return { bookmarkedIds, toggleBookmark, isLoading: !loaded }
}
