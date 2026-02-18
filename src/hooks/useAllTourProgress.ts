"use client"

import { useEffect, useSyncExternalStore, useState } from "react"
import {
  ensureTourProgressLoaded,
  getTourProgressSnapshot,
  subscribeTourProgress,
} from "@/lib/tourProgressStore"

/**
 * Loads all completed step IDs for the tour list page.
 * Used to show "Done" badges on lessons where every step is completed.
 */
export function useAllTourProgress(isLoggedIn: boolean): ReadonlySet<string> {
  const completedStepIds = useSyncExternalStore(
    subscribeTourProgress,
    getTourProgressSnapshot,
    () => new Set<string>()
  )
  const [, setLoaded] = useState(false)

  useEffect(() => {
    ensureTourProgressLoaded(isLoggedIn)
      .then(() => {
        setLoaded(true)
      })
      .catch(() => {})
  }, [isLoggedIn])

  return completedStepIds
}
