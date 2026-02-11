/**
 * Display order for difficulty filter: Beginner → Intermediate → Senior.
 * URL/filter values stay as stored (e.g. "advanced"); only labels are mapped.
 */
export const DIFFICULTY_DISPLAY_ORDER = ["beginner", "intermediate", "advanced"] as const

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Senior",
}

/**
 * Returns the display label for a difficulty value (e.g. "advanced" → "Senior").
 * Unknown values are capitalized.
 */
export function difficultyDisplayLabel(difficulty: string | null | undefined): string {
  if (!difficulty) return ""
  const key = difficulty.toLowerCase()
  return DIFFICULTY_LABELS[key] ?? difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
}

/**
 * Sort difficulty facet entries by display order (Beginner, Intermediate, Senior).
 */
export function sortDifficultiesByDisplayOrder<T extends { value: string }>(entries: T[]): T[] {
  const order = DIFFICULTY_DISPLAY_ORDER
  return [...entries].sort((a, b) => {
    const i = order.indexOf(a.value.toLowerCase())
    const j = order.indexOf(b.value.toLowerCase())
    if (i === -1 && j === -1) return 0
    if (i === -1) return 1
    if (j === -1) return -1
    return i - j
  })
}
