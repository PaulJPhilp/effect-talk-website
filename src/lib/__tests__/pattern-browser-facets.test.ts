import { describe, it, expect } from "vitest"
import { computeBrowserFacets } from "@/lib/pattern-browser-facets"

interface TestPattern {
  readonly id: string
  readonly category: string
  readonly difficulty: string
  readonly new: boolean
  readonly tags: readonly string[]
}

interface TestEntry {
  readonly pattern: TestPattern
  readonly tagSet: ReadonlySet<string>
}

function toEntry(pattern: TestPattern): TestEntry {
  return {
    pattern,
    tagSet: new Set(pattern.tags),
  }
}

const entries: readonly TestEntry[] = [
  toEntry({
    id: "1",
    category: "error-management",
    difficulty: "Beginner",
    new: true,
    tags: ["option", "either"],
  }),
  toEntry({
    id: "2",
    category: "error-management",
    difficulty: "Intermediate",
    new: false,
    tags: ["error"],
  }),
  toEntry({
    id: "3",
    category: "schema",
    difficulty: "Beginner",
    new: false,
    tags: ["validation"],
  }),
  toEntry({
    id: "4",
    category: "schema",
    difficulty: "Senior",
    new: true,
    tags: ["error"],
  }),
  toEntry({
    id: "5",
    category: "concurrency",
    difficulty: "Intermediate",
    new: true,
    tags: ["fiber", "error"],
  }),
]

describe("computeBrowserFacets", () => {
  it("returns expected counts without active filters", () => {
    const result = computeBrowserFacets(entries, {
      activeCategory: null,
      activeDifficulty: null,
      activeTags: new Set<string>(),
      activeNewOnly: false,
    })

    expect(result.filteredEntries).toHaveLength(5)
    expect(result.totalAfterSearch).toBe(5)
    expect(result.newCount).toBe(3)
    expect(result.categories).toEqual([
      { value: "error-management", count: 2 },
      { value: "schema", count: 2 },
      { value: "concurrency", count: 1 },
    ])
    expect(result.difficulties).toEqual([
      { value: "beginner", count: 2 },
      { value: "intermediate", count: 2 },
      { value: "senior", count: 1 },
    ])
  })

  it("computes category and difficulty counters from fully filtered set only", () => {
    const result = computeBrowserFacets(entries, {
      activeCategory: "error-management",
      activeDifficulty: null,
      activeTags: new Set<string>(),
      activeNewOnly: false,
    })

    expect(result.filteredEntries.map((entry) => entry.pattern.id)).toEqual(["1", "2"])
    expect(result.totalAfterSearch).toBe(2)
    expect(result.newCount).toBe(1)
    expect(result.categories).toEqual([{ value: "error-management", count: 2 }])
    expect(result.difficulties).toEqual([
      { value: "beginner", count: 1 },
      { value: "intermediate", count: 1 },
    ])
  })

  it("handles combined difficulty, new-only, and tag filters", () => {
    const result = computeBrowserFacets(entries, {
      activeCategory: null,
      activeDifficulty: "intermediate",
      activeTags: new Set(["error"]),
      activeNewOnly: true,
    })

    expect(result.filteredEntries.map((entry) => entry.pattern.id)).toEqual(["5"])
    expect(result.totalAfterSearch).toBe(1)
    expect(result.newCount).toBe(1)
    expect(result.categories).toEqual([{ value: "concurrency", count: 1 }])
    expect(result.difficulties).toEqual([{ value: "intermediate", count: 1 }])
  })

  it("all badge totals equal current result size when category + difficulty + new selected", () => {
    const result = computeBrowserFacets(entries, {
      activeCategory: "error-management",
      activeDifficulty: "beginner",
      activeTags: new Set<string>(),
      activeNewOnly: true,
    })

    expect(result.filteredEntries.map((entry) => entry.pattern.id)).toEqual(["1"])
    expect(result.totalAfterSearch).toBe(1)
    expect(result.newCount).toBe(1)
    expect(result.filteredEntries.length).toBe(result.totalAfterSearch)
    const difficultySum = result.difficulties.reduce((sum, d) => sum + d.count, 0)
    expect(difficultySum).toBe(result.totalAfterSearch)
    const categorySum = result.categories.reduce((sum, c) => sum + c.count, 0)
    expect(categorySum).toBe(result.totalAfterSearch)
  })
})
