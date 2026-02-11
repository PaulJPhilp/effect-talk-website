"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PatternsSidebar } from "@/components/PatternsSidebar"
import { PatternCard } from "@/components/PatternCard"
import { Badge } from "@/components/ui/badge"
import type { Pattern } from "@/services/BackendApi"
import { cn } from "@/lib/utils"

interface PatternsBrowserProps {
  readonly patterns: readonly Pattern[]
  /** Optional hint when patterns.length === 0 (e.g. DATABASE_URL / docs link). */
  readonly emptyStateHint?: React.ReactNode
}

interface FacetCount {
  readonly value: string
  readonly count: number
}

/**
 * Client-side filtering and browsing for patterns.
 * All patterns are passed from server, then filtered client-side for instant UX.
 * Filter state is synced with URL search params for deep linking.
 */
export function PatternsBrowser({ patterns, emptyStateHint }: PatternsBrowserProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read filter state from URL params
  const query = searchParams.get("q")?.toLowerCase().trim() ?? ""
  const activeCategory = searchParams.get("category") ?? null
  const activeDifficulty = searchParams.get("difficulty")?.toLowerCase() ?? null
  const activeTags = searchParams.getAll("tag")
  const activeNewOnly = searchParams.get("new") === "1"

  // Compute available facets from ALL patterns (not filtered subset)
  const { categories, difficulties, tags, newCount } = useMemo(() => {
    const categoryMap = new Map<string, number>()
    const difficultyMap = new Map<string, number>()
    const tagMap = new Map<string, number>()
    let newPatternCount = 0

    for (const pattern of patterns) {
      if (pattern.new) newPatternCount++
      if (pattern.category) {
        categoryMap.set(pattern.category, (categoryMap.get(pattern.category) ?? 0) + 1)
      }
      if (pattern.difficulty) {
        const diffLower = pattern.difficulty.toLowerCase()
        difficultyMap.set(diffLower, (difficultyMap.get(diffLower) ?? 0) + 1)
      }
      if (pattern.tags) {
        for (const tag of pattern.tags) {
          tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
        }
      }
    }

    const toFacetArray = (map: Map<string, number>): FacetCount[] =>
      Array.from(map.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)

    return {
      categories: toFacetArray(categoryMap),
      difficulties: toFacetArray(difficultyMap),
      tags: toFacetArray(tagMap),
      newCount: newPatternCount,
    }
  }, [patterns])

  // Filter patterns client-side
  const filteredPatterns = useMemo(() => {
    return patterns.filter((pattern) => {
      // Text search (query)
      if (query) {
        const searchable = `${pattern.title} ${pattern.description} ${pattern.tags?.join(" ") ?? ""}`.toLowerCase()
        if (!searchable.includes(query)) {
          return false
        }
      }

      // Category filter
      if (activeCategory && pattern.category !== activeCategory) {
        return false
      }

      // Difficulty filter
      if (activeDifficulty && pattern.difficulty?.toLowerCase() !== activeDifficulty) {
        return false
      }

      // Tag filters (AND logic - pattern must have ALL selected tags)
      if (activeTags.length > 0) {
        const patternTags = pattern.tags ?? []
        const hasAllTags = activeTags.every((tag) => patternTags.includes(tag))
        if (!hasAllTags) {
          return false
        }
      }

      // New-only filter
      if (activeNewOnly && !pattern.new) {
        return false
      }

      return true
    })
  }, [patterns, query, activeCategory, activeDifficulty, activeTags, activeNewOnly])

  // Update URL params when filters change
  const updateSearchParams = (updates: {
    category?: string | null
    difficulty?: string | null
    tag?: string | null | string[]
    new?: boolean | null
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.category !== undefined) {
      if (updates.category) {
        params.set("category", updates.category)
      } else {
        params.delete("category")
      }
    }

    if (updates.difficulty !== undefined) {
      if (updates.difficulty) {
        params.set("difficulty", updates.difficulty)
      } else {
        params.delete("difficulty")
      }
    }

    if (updates.tag !== undefined) {
      params.delete("tag")
      if (Array.isArray(updates.tag) && updates.tag.length > 0) {
        for (const tag of updates.tag) {
          params.append("tag", tag)
        }
      } else if (typeof updates.tag === "string") {
        params.append("tag", updates.tag)
      }
    }

    if (updates.new !== undefined) {
      if (updates.new) {
        params.set("new", "1")
      } else {
        params.delete("new")
      }
    }

    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleCategoryChange = (category: string | null) => {
    updateSearchParams({ category })
  }

  const handleDifficultyChange = (difficulty: string | null) => {
    updateSearchParams({ difficulty })
  }

  const handleTagToggle = (tag: string) => {
    const currentTags = activeTags
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]
    updateSearchParams({ tag: newTags.length > 0 ? newTags : null })
  }

  const handleNewFilterChange = (newOnly: boolean) => {
    updateSearchParams({ new: newOnly || null })
  }

  const hasActiveFilters =
    activeCategory !== null ||
    activeDifficulty !== null ||
    activeTags.length > 0 ||
    activeNewOnly

  const handleClearAll = () => {
    router.replace("/patterns", { scroll: false })
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar - visible on all viewports so New and other filters are always available */}
      {patterns.length > 0 && (
        <div className="w-full md:w-auto">
          <PatternsSidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            onClearAll={handleClearAll}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {/* Result count */}
        {patterns.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredPatterns.length === patterns.length ? (
                <>Showing all {patterns.length} patterns</>
              ) : (
                <>
                  Showing {filteredPatterns.length} of {patterns.length} patterns
                </>
              )}
            </p>
          </div>
        )}

        {/* New filter - top of patterns area */}
        {patterns.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              New
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleNewFilterChange(false)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  !activeNewOnly
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span>All</span>
                <Badge variant="secondary" className="text-xs">
                  {patterns.length}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => handleNewFilterChange(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeNewOnly
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span>New only</span>
                <Badge variant="secondary" className="text-xs">
                  {newCount}
                </Badge>
              </button>
            </div>
          </div>
        )}

        {/* Difficulty filter - below New */}
        {patterns.length > 0 && difficulties.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Difficulty
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDifficultyChange(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors capitalize",
                  activeDifficulty === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <span>All</span>
                <Badge variant="secondary" className="text-xs">
                  {difficulties.reduce((sum, d) => sum + d.count, 0)}
                </Badge>
              </button>
              {difficulties.map((diff) => (
                <button
                  type="button"
                  key={diff.value}
                  onClick={() =>
                    handleDifficultyChange(diff.value === activeDifficulty ? null : diff.value)
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors capitalize",
                    activeDifficulty === diff.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span>{diff.value}</span>
                  <Badge variant="secondary" className="text-xs">
                    {diff.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pattern cards grid */}
        {patterns.length === 0 ? (
          <div className="text-center py-12">
            {emptyStateHint ?? <p className="text-muted-foreground">No patterns available.</p>}
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No patterns found matching your filters.</p>
            {(query || activeCategory || activeDifficulty || activeTags.length > 0 || activeNewOnly) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
