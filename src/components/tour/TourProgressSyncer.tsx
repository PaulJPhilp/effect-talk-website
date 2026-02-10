"use client"

import { useEffect } from "react"
import { syncProgressToDB } from "@/lib/tourProgressSync"

interface TourProgressSyncerProps {
  readonly isLoggedIn: boolean
}

/**
 * Runs once when an authenticated user loads the app to merge any
 * guest localStorage progress into the database.
 */
export function TourProgressSyncer({ isLoggedIn }: TourProgressSyncerProps) {
  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    syncProgressToDB().catch(() => {})
  }, [isLoggedIn])

  return null
}
