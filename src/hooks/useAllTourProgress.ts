"use client"

import { useAtomValue } from "@effect-atom/atom-react"
import { completedStepIdsAtom } from "@/lib/tourAtoms"
import { useTourProgressLoader } from "@/hooks/useTourProgress"

/**
 * Loads all completed step IDs for the tour list page.
 * Used to show "Done" badges on lessons where every step is completed.
 */
export function useAllTourProgress(isLoggedIn: boolean): ReadonlySet<string> {
  const completedStepIds = useAtomValue(completedStepIdsAtom)
  useTourProgressLoader(isLoggedIn)
  return completedStepIds
}
