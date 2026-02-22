/**
 * Persist "last viewed step" per lesson so returning to a lesson restores position.
 */

const POSITION_STORAGE_KEY = "tour_last_step"

export interface TourPositionMap {
  readonly [lessonSlug: string]: number
}

function getPositionMap(): TourPositionMap {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(POSITION_STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as TourPositionMap
  } catch {
    return {}
  }
}

export function getLastStepForLesson(lessonSlug: string): number | null {
  const map = getPositionMap()
  const step = map[lessonSlug]
  return typeof step === "number" && Number.isInteger(step) && step >= 1 ? step : null
}

export function setLastStepForLesson(lessonSlug: string, stepOrderIndex: number): void {
  if (typeof window === "undefined") return
  try {
    const map = getPositionMap()
    const next: TourPositionMap = { ...map, [lessonSlug]: stepOrderIndex }
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore errors
  }
}
