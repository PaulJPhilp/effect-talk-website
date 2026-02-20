/**
 * Utility functions for syncing tour progress between localStorage (guest) and DB (logged-in).
 */

const PROGRESS_STORAGE_KEY = "tour_progress"

export interface LocalStorageProgress {
  readonly [stepId: string]: "completed" | "skipped"
}

/**
 * Get progress from localStorage (for guests).
 */
export function getLocalStorageProgress(): LocalStorageProgress {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as LocalStorageProgress
  } catch {
    return {}
  }
}

/**
 * Mark a single step as completed in localStorage.
 */
export function setLocalStorageStepCompleted(stepId: string): void {
  if (typeof window === "undefined") return
  try {
    const current = getLocalStorageProgress()
    const next: LocalStorageProgress = {
      ...current,
      [stepId]: "completed",
    }
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore errors
  }
}

/**
 * Clear progress from localStorage (after syncing to DB).
 */
export function clearLocalStorageProgress(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

/**
 * Fetch all progress from the API (authenticated users only).
 */
export async function fetchProgressFromAPI(): Promise<
  { readonly step_id: string; readonly status: string }[]
> {
  const response = await fetch("/api/tour/progress", { method: "GET" })
  if (!response.ok) return []
  const payload = await response.json()
  return payload.progress ?? []
}

/**
 * Persist a single step completion to the database.
 */
export async function persistStepCompleted(stepId: string): Promise<void> {
  await fetch("/api/tour/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, status: "completed" }),
  })
}

/**
 * Sync localStorage progress to DB (called when guest signs in).
 *
 * localStorage is intentionally kept after a successful sync.  The sync
 * endpoint uses upsert so re-syncing identical data is harmless, and
 * keeping localStorage ensures progress survives page refreshes even if
 * the DB write silently failed (the sync API returns 200 on partial
 * failures due to its catchAll error handling).
 */
export async function syncProgressToDB(): Promise<void> {
  const localProgress = getLocalStorageProgress()
  if (Object.keys(localProgress).length === 0) return

  try {
    await fetch("/api/tour/progress/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        progress: Object.entries(localProgress).map(([stepId, status]) => ({
          stepId,
          status,
        })),
      }),
    })
  } catch (error) {
    console.error("Failed to sync progress:", error)
  }
}
