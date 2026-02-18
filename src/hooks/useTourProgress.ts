"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import {
  ensureTourProgressLoaded,
  getTourProgressSnapshot,
  markTourStepCompletedLocally,
  persistTourStepCompleted,
  subscribeTourProgress,
} from "@/lib/tourProgressStore"
import type { TourStep } from "@/services/TourProgress/types"

interface UseTourProgressArgs {
  readonly steps: readonly TourStep[]
  readonly isLoggedIn: boolean
}

interface UseTourProgressResult {
  readonly completedStepIds: ReadonlySet<string>
  readonly markStepCompleted: (stepId: string) => void
}

export function useTourProgress({
  steps,
  isLoggedIn,
}: UseTourProgressArgs): UseTourProgressResult {
  const allCompletedStepIds = useSyncExternalStore(
    subscribeTourProgress,
    getTourProgressSnapshot,
    () => new Set<string>()
  )

  const validStepIds = useMemo(
    () => new Set(steps.map((step) => step.id)),
    [steps]
  )

  useEffect(() => {
    ensureTourProgressLoaded(isLoggedIn).catch(() => {})
  }, [isLoggedIn])

  const completedStepIds = useMemo(() => {
    const filtered = new Set<string>()
    for (const stepId of allCompletedStepIds) {
      if (validStepIds.has(stepId)) {
        filtered.add(stepId)
      }
    }
    return filtered
  }, [allCompletedStepIds, validStepIds])

  const markStepCompleted = useCallback((stepId: string) => {
    if (!validStepIds.has(stepId)) {
      return
    }

    markTourStepCompletedLocally(stepId, isLoggedIn)
    if (isLoggedIn) {
      persistTourStepCompleted(stepId).catch(() => {})
    }
  }, [isLoggedIn, validStepIds])

  return {
    completedStepIds,
    markStepCompleted,
  }
}
