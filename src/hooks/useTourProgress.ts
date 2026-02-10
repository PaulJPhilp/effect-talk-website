"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getLocalStorageProgress,
  setLocalStorageStepCompleted,
  syncProgressToDB,
} from "@/lib/tourProgressSync"
import type { TourStep } from "@/services/TourProgress/types"

interface TourProgressApiItem {
  readonly step_id: string
  readonly status: "not_started" | "completed" | "skipped"
}

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
  const [completedStepIds, setCompletedStepIds] = useState<ReadonlySet<string>>(new Set())

  const validStepIds = useMemo(
    () => new Set(steps.map((step) => step.id)),
    [steps]
  )

  useEffect(() => {
    let isCancelled = false

    async function loadProgress(): Promise<void> {
      if (!isLoggedIn) {
        const local = getLocalStorageProgress()
        const completed = new Set<string>()
        for (const [stepId, status] of Object.entries(local)) {
          if (status === "completed" && validStepIds.has(stepId)) {
            completed.add(stepId)
          }
        }
        if (!isCancelled) {
          setCompletedStepIds(completed)
        }
        return
      }

      // Merge any guest session progress after authentication.
      await syncProgressToDB()

      const response = await fetch("/api/tour/progress", { method: "GET" })
      if (!response.ok) {
        if (!isCancelled) {
          setCompletedStepIds(new Set())
        }
        return
      }

      const payload = await response.json() as {
        readonly progress?: readonly TourProgressApiItem[]
      }

      const completed = new Set<string>()
      for (const item of payload.progress ?? []) {
        if (item.status === "completed" && validStepIds.has(item.step_id)) {
          completed.add(item.step_id)
        }
      }

      if (!isCancelled) {
        setCompletedStepIds(completed)
      }
    }

    loadProgress().catch(() => {
      if (!isCancelled) {
        setCompletedStepIds(new Set())
      }
    })

    return () => {
      isCancelled = true
    }
  }, [isLoggedIn, validStepIds])

  const markStepCompleted = useCallback((stepId: string) => {
    if (!validStepIds.has(stepId)) {
      return
    }

    setCompletedStepIds((previous) => {
      if (previous.has(stepId)) {
        return previous
      }
      const next = new Set(previous)
      next.add(stepId)
      return next
    })

    if (!isLoggedIn) {
      setLocalStorageStepCompleted(stepId)
      return
    }

    fetch("/api/tour/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId,
        status: "completed",
      }),
    }).catch(() => {})
  }, [isLoggedIn, validStepIds])

  return {
    completedStepIds,
    markStepCompleted,
  }
}
