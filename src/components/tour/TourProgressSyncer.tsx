"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { primeTourAuthenticatedSync } from "@/lib/tourProgressStore"

interface TourProgressSyncerProps {
  readonly isLoggedIn: boolean
}

/**
 * Runs once when an authenticated user loads the app to merge any
 * guest localStorage progress into the database.
 */
export function TourProgressSyncer({ isLoggedIn }: TourProgressSyncerProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoggedIn) {
      return
    }

    if (!pathname.startsWith("/tour")) {
      return
    }

    const sessionKey = "tour_progress_sync_done"
    if (sessionStorage.getItem(sessionKey) === "1") {
      return
    }

    primeTourAuthenticatedSync()
      .then(() => {
        sessionStorage.setItem(sessionKey, "1")
      })
      .catch(() => {})
  }, [isLoggedIn, pathname])

  return null
}
