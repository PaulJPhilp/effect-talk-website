"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import { PatternCard } from "@/components/PatternCard";
import { PatternsSidebar } from "@/components/PatternsSidebar";
import { Badge } from "@/components/ui/badge";
import { useBookmarks } from "@/hooks/useBookmarks";
import {
  DIFFICULTY_DISPLAY_ORDER,
  difficultyDisplayLabel,
  sortDifficultiesByDisplayOrder,
} from "@/lib/difficulty";
import { computeBrowserFacets } from "@/lib/pattern-browser-facets";
import {
  markInput,
  measureSync,
  recordPaintFromInput,
} from "@/lib/pattern-browser-perf";
import { cn } from "@/lib/utils";
import type { Pattern } from "@/services/BackendApi";

const VIRTUALIZE_THRESHOLD = 60;
/** Card height estimate + gap-3 (12px) for accurate scroll height */
const CARD_ESTIMATE_PX = 252;

const SORT_BEGINNER_FIRST = "beginner-first";
const SORT_SENIOR_FIRST = "senior-first";
type SortOrder = typeof SORT_BEGINNER_FIRST | typeof SORT_SENIOR_FIRST;

interface PatternsVirtualListProps {
  readonly bookmarkedIds: ReadonlySet<string>;
  readonly onToggleBookmark: (patternId: string) => void;
  readonly patterns: readonly Pattern[];
}

function PatternsVirtualList({
  patterns,
  bookmarkedIds,
  onToggleBookmark,
}: PatternsVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is compatible; false positive
  const virtualizer = useVirtualizer({
    count: patterns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_ESTIMATE_PX,
    overscan: 5,
    getItemKey: (index) => patterns[index].id,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      className="overflow-auto rounded-md"
      ref={parentRef}
      style={{ maxHeight: "70vh" }}
    >
      <div
        aria-label="Pattern list"
        role="presentation"
        style={{ height: totalSize, position: "relative", width: "100%" }}
      >
        {virtualItems.map((virtualRow) => {
          const pattern = patterns[virtualRow.index];
          return (
            <div
              data-index={virtualRow.index}
              key={pattern.id}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                minHeight: `${virtualRow.size}px`,
                paddingBottom: "0.75rem",
              }}
            >
              <PatternCard
                isBookmarked={bookmarkedIds.has(pattern.id)}
                onToggleBookmark={onToggleBookmark}
                pattern={pattern}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PatternsBrowserProps {
  /** Optional hint when patterns.length === 0 (e.g. DATABASE_URL / docs link). */
  readonly emptyStateHint?: React.ReactNode;
  readonly isLoggedIn?: boolean;
  readonly patterns: readonly Pattern[];
}

/**
 * Client-side filtering and browsing for patterns.
 * All patterns are passed from server, then filtered client-side for instant UX.
 * Filter state is synced with URL search params for deep linking.
 */
export function PatternsBrowser({
  patterns,
  emptyStateHint,
  isLoggedIn = false,
}: PatternsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bookmarkedIds, toggleBookmark } = useBookmarks(isLoggedIn);

  // Read filter state from URL params
  const query = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const activeCategory = searchParams.get("category") ?? null;
  const activeDifficulty =
    searchParams.get("difficulty")?.toLowerCase() ?? null;
  const activeTags = searchParams.getAll("tag");
  const activeNewOnly = searchParams.get("new") === "1";
  const activeBookmarkedOnly = searchParams.get("bookmarked") === "1";
  const sortOrder: SortOrder =
    searchParams.get("sort") === SORT_SENIOR_FIRST
      ? SORT_SENIOR_FIRST
      : SORT_BEGINNER_FIRST;

  // Mark user input for keystroke-to-paint latency (dev perf baseline)
  const prevParamsRef = useRef({
    query,
    activeCategory,
    activeDifficulty,
    activeTags: activeTags.length,
    activeNewOnly,
    sortOrder,
  });
  useLayoutEffect(() => {
    const prev = prevParamsRef.current;
    const changed =
      prev.query !== query ||
      prev.activeCategory !== activeCategory ||
      prev.activeDifficulty !== activeDifficulty ||
      prev.activeTags !== activeTags.length ||
      prev.activeNewOnly !== activeNewOnly ||
      prev.sortOrder !== sortOrder;
    if (changed) {
      markInput();
      prevParamsRef.current = {
        query,
        activeCategory,
        activeDifficulty,
        activeTags: activeTags.length,
        activeNewOnly,
        sortOrder,
      };
    }
  }, [
    query,
    activeCategory,
    activeDifficulty,
    activeTags.length,
    activeNewOnly,
    sortOrder,
  ]);

  // Precompute per-pattern searchable text and tag Set once per patterns input
  interface PatternEntry {
    readonly pattern: Pattern;
    readonly searchable: string;
    readonly tagSet: ReadonlySet<string>;
  }
  const precomputedEntries = useMemo((): readonly PatternEntry[] => {
    return patterns.map((pattern) => ({
      pattern,
      searchable:
        `${pattern.title} ${pattern.description} ${pattern.tags?.join(" ") ?? ""}`.toLowerCase(),
      tagSet: new Set(pattern.tags ?? []),
    }));
  }, [patterns]);

  // Search-filtered entries (keep entries for downstream filter to use tagSet)
  const searchFilteredEntries = useMemo(() => {
    return measureSync("searchFilterMs", () =>
      query
        ? precomputedEntries.filter((e) => e.searchable.includes(query))
        : precomputedEntries
    );
  }, [precomputedEntries, query]);

  // Apply category/difficulty/tag/new filters to search-filtered list (no duplicate search)
  const activeTagsSet = useMemo(() => new Set(activeTags), [activeTags]);

  const facetData = useMemo(() => {
    return measureSync("facetCountMs", () => {
      return computeBrowserFacets(searchFilteredEntries, {
        activeCategory,
        activeDifficulty,
        activeTags: activeTagsSet,
        activeNewOnly,
      });
    });
  }, [
    searchFilteredEntries,
    activeCategory,
    activeDifficulty,
    activeTagsSet,
    activeNewOnly,
  ]);

  const categories = facetData.categories;
  const difficulties = useMemo(
    () => sortDifficultiesByDisplayOrder(facetData.difficulties),
    [facetData.difficulties]
  );
  const newCount = facetData.newCount;
  const totalAfterSearch = facetData.totalAfterSearch;

  const filteredPatterns = useMemo(() => {
    return measureSync("filterApplyMs", () =>
      facetData.filteredEntries.map((entry) => entry.pattern)
    );
  }, [facetData.filteredEntries]);

  // Bookmark filter — applied after facet computation so facet counts stay accurate
  const bookmarkFilteredPatterns = useMemo(() => {
    if (!activeBookmarkedOnly) {
      return filteredPatterns;
    }
    return filteredPatterns.filter((p) => bookmarkedIds.has(p.id));
  }, [filteredPatterns, activeBookmarkedOnly, bookmarkedIds]);

  const bookmarkedCount = useMemo(() => {
    return filteredPatterns.filter((p) => bookmarkedIds.has(p.id)).length;
  }, [filteredPatterns, bookmarkedIds]);

  // Sort filtered patterns by difficulty (beginner → senior or senior → beginner)
  const difficultyOrderMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const [index, value] of DIFFICULTY_DISPLAY_ORDER.entries()) {
      m.set(value, index);
    }
    m.set("senior", 2); // alias for "advanced"
    return m;
  }, []);

  const sortedPatterns = useMemo(() => {
    return measureSync("sortMs", () => {
      const getOrder = (p: Pattern): number =>
        difficultyOrderMap.get(p.difficulty?.toLowerCase() ?? "") ?? -1;
      return [...bookmarkFilteredPatterns].sort((a, b) => {
        const ia = getOrder(a);
        const ib = getOrder(b);
        if (ia === -1 && ib === -1) {
          return 0;
        }
        if (ia === -1) {
          return 1;
        }
        if (ib === -1) {
          return -1;
        }
        return sortOrder === SORT_SENIOR_FIRST ? ib - ia : ia - ib;
      });
    });
  }, [bookmarkFilteredPatterns, sortOrder, difficultyOrderMap]);

  // Record paint-after-input for baseline (dev perf)
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      recordPaintFromInput();
    });
    return () => cancelAnimationFrame(raf);
  });

  // Update URL params when filters change
  const updateSearchParams = (updates: {
    category?: string | null;
    difficulty?: string | null;
    tag?: string | null | string[];
    new?: boolean | null;
    sort?: SortOrder | null;
    bookmarked?: boolean | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.category !== undefined) {
      if (updates.category) {
        params.set("category", updates.category);
      } else {
        params.delete("category");
      }
    }

    if (updates.difficulty !== undefined) {
      if (updates.difficulty) {
        params.set("difficulty", updates.difficulty);
      } else {
        params.delete("difficulty");
      }
    }

    if (updates.tag !== undefined) {
      params.delete("tag");
      if (Array.isArray(updates.tag) && updates.tag.length > 0) {
        for (const tag of updates.tag) {
          params.append("tag", tag);
        }
      } else if (typeof updates.tag === "string") {
        params.append("tag", updates.tag);
      }
    }

    if (updates.new !== undefined) {
      if (updates.new) {
        params.set("new", "1");
      } else {
        params.delete("new");
      }
    }

    if (updates.bookmarked !== undefined) {
      if (updates.bookmarked) {
        params.set("bookmarked", "1");
      } else {
        params.delete("bookmarked");
      }
    }

    if (updates.sort !== undefined) {
      if (updates.sort == null) {
        params.delete("sort");
      } else {
        params.set("sort", updates.sort);
      }
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCategoryChange = (category: string | null) => {
    updateSearchParams({ category });
  };

  const handleDifficultyChange = (difficulty: string | null) => {
    updateSearchParams({ difficulty });
  };

  const handleNewFilterChange = (newOnly: boolean) => {
    updateSearchParams({ new: newOnly || null });
  };

  const handleBookmarkedFilterChange = (bookmarkedOnly: boolean) => {
    updateSearchParams({ bookmarked: bookmarkedOnly || null });
  };

  const handleClearAll = () => {
    router.replace("/patterns", { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* Sidebar - visible on all viewports so New and other filters are always available */}
      {patterns.length > 0 && (
        <div className="w-full md:w-auto">
          <PatternsSidebar
            activeCategory={activeCategory}
            categories={categories}
            onCategoryChange={handleCategoryChange}
            onClearAll={handleClearAll}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="min-w-0 flex-1">
        {/* Sort by difficulty - top of browser */}
        {patterns.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Sort by difficulty
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  sortOrder === SORT_BEGINNER_FIRST
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() =>
                  updateSearchParams({ sort: SORT_BEGINNER_FIRST })
                }
                type="button"
              >
                Beginner → Senior
              </button>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  sortOrder === SORT_SENIOR_FIRST
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => updateSearchParams({ sort: SORT_SENIOR_FIRST })}
                type="button"
              >
                Senior → Beginner
              </button>
            </div>
          </div>
        )}
        {/* Result count */}
        {patterns.length > 0 && (
          <div className="mb-4">
            <p className="text-muted-foreground text-sm">
              {bookmarkFilteredPatterns.length === patterns.length ? (
                <>Showing all {patterns.length} patterns</>
              ) : (
                <>
                  Showing {bookmarkFilteredPatterns.length} of {patterns.length}{" "}
                  patterns
                </>
              )}
            </p>
          </div>
        )}

        {/* New filter - top of patterns area */}
        {patterns.length > 0 && (
          <div className="mb-3">
            <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              New
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeNewOnly
                    ? "text-muted-foreground hover:bg-muted/50"
                    : "bg-primary/10 font-medium text-primary"
                )}
                onClick={() => handleNewFilterChange(false)}
                type="button"
              >
                <span>All</span>
                <Badge className="text-xs" variant="secondary">
                  {totalAfterSearch}
                </Badge>
              </button>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeNewOnly
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => handleNewFilterChange(true)}
                type="button"
              >
                <span>New only</span>
                <Badge className="text-xs" variant="secondary">
                  {newCount}
                </Badge>
              </button>
            </div>
          </div>
        )}

        {/* Bookmarks filter - between New and Difficulty */}
        {patterns.length > 0 && bookmarkedIds.size > 0 && (
          <div className="mb-3">
            <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Bookmarks
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeBookmarkedOnly
                    ? "text-muted-foreground hover:bg-muted/50"
                    : "bg-primary/10 font-medium text-primary"
                )}
                onClick={() => handleBookmarkedFilterChange(false)}
                type="button"
              >
                <span>All</span>
              </button>
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeBookmarkedOnly
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => handleBookmarkedFilterChange(true)}
                type="button"
              >
                <span>Bookmarked only</span>
                <Badge className="text-xs" variant="secondary">
                  {bookmarkedCount}
                </Badge>
              </button>
            </div>
          </div>
        )}

        {/* Difficulty filter - below Bookmarks */}
        {patterns.length > 0 && difficulties.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Difficulty
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                  activeDifficulty === null
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => handleDifficultyChange(null)}
                type="button"
              >
                <span>All</span>
                <Badge className="text-xs" variant="secondary">
                  {difficulties.reduce((sum, d) => sum + d.count, 0)}
                </Badge>
              </button>
              {difficulties.map((diff) => (
                <button
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                    activeDifficulty === diff.value
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  key={diff.value}
                  onClick={() =>
                    handleDifficultyChange(
                      diff.value === activeDifficulty ? null : diff.value
                    )
                  }
                  type="button"
                >
                  <span>{difficultyDisplayLabel(diff.value)}</span>
                  <Badge className="text-xs" variant="secondary">
                    {diff.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pattern cards grid */}
        {patterns.length === 0 ? (
          <div className="py-12 text-center">
            {emptyStateHint ?? (
              <p className="text-muted-foreground">No patterns available.</p>
            )}
          </div>
        ) : bookmarkFilteredPatterns.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No patterns found matching your filters.
            </p>
            {(query ||
              activeCategory ||
              activeDifficulty ||
              activeTags.length > 0 ||
              activeNewOnly ||
              activeBookmarkedOnly) && (
              <button
                className="mt-4 text-primary text-sm hover:underline"
                onClick={handleClearAll}
                type="button"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : sortedPatterns.length <= VIRTUALIZE_THRESHOLD ? (
          <div className="grid gap-3">
            {sortedPatterns.map((pattern) => (
              <PatternCard
                isBookmarked={bookmarkedIds.has(pattern.id)}
                key={pattern.id}
                onToggleBookmark={toggleBookmark}
                pattern={pattern}
              />
            ))}
          </div>
        ) : (
          <PatternsVirtualList
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={toggleBookmark}
            patterns={sortedPatterns}
          />
        )}
      </div>
    </div>
  );
}
