"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useAtom, useAtomValue } from "@effect-atom/atom-react"
import { completedStepIdsAtom, progressLoadedAtom } from "@/lib/tourAtoms"
import {
  getLocalStorageProgress,
  setLocalStorageStepCompleted,
  syncProgressToDB,
  fetchProgressFromAPI,
  persistStepCompleted,
} from "@/lib/tourProgressSync"
import type { TourStep } from "@/services/TourProgress/types"

interface UseTourProgressArgs {
  readonly steps: readonly TourStep[]
  readonly isLoggedIn: boolean
}

interface UseTourProgressResult {
  readonly completedStepIds: ReadonlySet<string>
  readonly markStepCompleted: (stepId: string) => void
  readonly isLoading: boolean
}

// Track which data sources have been loaded (module-scoped, not an atom,
// because this is control flow — not reactive state the UI renders).
const loadedSources = { guest: false, authenticated: false }
let loadPromise: Promise<void> | null = null

/**
 * Shared loader hook — loads progress from localStorage and/or API into atoms.
 * Both useTourProgress and useAllTourProgress call this.
 */
export function useTourProgressLoader(isLoggedIn: boolean): void {
  const [, setAllCompleted] = useAtom(completedStepIdsAtom)
  const [, setLoaded] = useAtom(progressLoadedAtom)

  useEffect(() => {
    const source = isLoggedIn ? "authenticated" : "guest"
    if (loadedSources[source]) return

    // Dedup concurrent calls
    if (!loadPromise) {
      loadPromise = (async () => {
        // Always read localStorage first (works for both guest and auth)
        const local = getLocalStorageProgress()
        const fromLocal = new Set<string>()
        for (const [stepId, status] of Object.entries(local)) {
          if (status === "completed") fromLocal.add(stepId)
        }
        if (fromLocal.size > 0) {
          setAllCompleted((prev) => {
            const merged = new Set(prev)
            for (const id of fromLocal) merged.add(id)
            return merged
          })
        }
        loadedSources.guest = true

        if (isLoggedIn) {
          // Sync localStorage → DB (idempotent upsert)
          await syncProgressToDB()

          // Fetch canonical state from DB
          try {
            const dbProgress = await fetchProgressFromAPI()
            const fromDB = dbProgress
              .filter((p) => p.status === "completed")
              .map((p) => p.step_id)
            if (fromDB.length > 0) {
              setAllCompleted((prev) => {
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
  }, [isLoggedIn, setAllCompleted, setLoaded])
}

/**
 * Reset loader state — for testing only.
 */
export function _resetLoaderState(): void {
  loadedSources.guest = false
  loadedSources.authenticated = false
  loadPromise = null
}

export function useTourProgress({
  steps,
  isLoggedIn,
}: UseTourProgressArgs): UseTourProgressResult {
  const [allCompleted, setAllCompleted] = useAtom(completedStepIdsAtom)
  const loaded = useAtomValue(progressLoadedAtom)

  const validStepIds = useMemo(
    () => new Set(steps.map((s) => s.id)),
    [steps]
  )

  // Load progress from localStorage / API
  useTourProgressLoader(isLoggedIn)

  // Filter to this lesson's steps
  const completedStepIds = useMemo(() => {
    const filtered = new Set<string>()
    for (const stepId of allCompleted) {
      if (validStepIds.has(stepId)) filtered.add(stepId)
    }
    return filtered
  }, [allCompleted, validStepIds])

  const markStepCompleted = useCallback(
    (stepId: string) => {
      if (!validStepIds.has(stepId) || allCompleted.has(stepId)) return

      // 1. Update atom (immediate UI update)
      setAllCompleted((prev) => {
        const next = new Set(prev)
        next.add(stepId)
        return next
      })

      // 2. Persist to localStorage (survives refresh)
      setLocalStorageStepCompleted(stepId)

      // 3. Persist to DB if authenticated (fire-and-forget)
      if (isLoggedIn) {
        persistStepCompleted(stepId).catch((err) =>
          console.warn("Failed to persist step to DB:", err)
        )
      }
    },
    [isLoggedIn, validStepIds, allCompleted, setAllCompleted]
  )

  return { completedStepIds, markStepCompleted, isLoading: !loaded }
}
