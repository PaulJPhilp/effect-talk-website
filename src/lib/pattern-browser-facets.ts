interface FacetCount {
  readonly value: string
  readonly count: number
}

interface PatternFacetShape {
  readonly category?: string | null
  readonly difficulty?: string | null
  readonly new?: boolean
}

interface PatternFacetEntry<TPattern extends PatternFacetShape = PatternFacetShape> {
  readonly pattern: TPattern
  readonly tagSet: ReadonlySet<string>
}

interface PatternFacetFilters {
  readonly activeCategory: string | null
  readonly activeDifficulty: string | null
  readonly activeTags: ReadonlySet<string>
  readonly activeNewOnly: boolean
}

interface BrowserFacetComputation<TPattern extends PatternFacetShape> {
  readonly filteredEntries: readonly PatternFacetEntry<TPattern>[]
  readonly categories: readonly FacetCount[]
  readonly difficulties: readonly FacetCount[]
  readonly newCount: number
  readonly totalAfterSearch: number
}

function hasAllActiveTags(
  entry: PatternFacetEntry,
  activeTags: ReadonlySet<string>,
): boolean {
  for (const activeTag of activeTags) {
    if (!entry.tagSet.has(activeTag)) {
      return false
    }
  }
  return true
}

function toSortedFacetArray(facetMap: Map<string, number>): readonly FacetCount[] {
  return Array.from(facetMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
}

export function computeBrowserFacets<TPattern extends PatternFacetShape>(
  entries: readonly PatternFacetEntry<TPattern>[],
  filters: PatternFacetFilters,
): BrowserFacetComputation<TPattern> {
  const filteredEntries: PatternFacetEntry<TPattern>[] = []
  const categoryMap = new Map<string, number>()
  const difficultyMap = new Map<string, number>()
  let newCount = 0
  let totalAfterSearch = 0

  for (const entry of entries) {
    if (!hasAllActiveTags(entry, filters.activeTags)) {
      continue
    }

    const category = entry.pattern.category ?? null
    const difficulty = entry.pattern.difficulty?.toLowerCase() ?? null
    const isNew = entry.pattern.new === true

    const matchesCategory =
      filters.activeCategory === null || category === filters.activeCategory
    const matchesDifficulty =
      filters.activeDifficulty === null || difficulty === filters.activeDifficulty
    const matchesNew = !filters.activeNewOnly || isNew

    const inCurrentResult =
      matchesCategory && matchesDifficulty && matchesNew

    if (!inCurrentResult) {
      continue
    }

    filteredEntries.push(entry)
    totalAfterSearch++
    if (isNew) {
      newCount++
    }
    if (category !== null) {
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1)
    }
    if (difficulty !== null) {
      difficultyMap.set(difficulty, (difficultyMap.get(difficulty) ?? 0) + 1)
    }
  }

  return {
    filteredEntries,
    categories: toSortedFacetArray(categoryMap),
    difficulties: toSortedFacetArray(difficultyMap),
    newCount,
    totalAfterSearch,
  }
}
