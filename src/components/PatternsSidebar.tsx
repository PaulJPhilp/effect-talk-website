"use client";

import { Filter, X } from "lucide-react";
import { PatternsSearch } from "@/components/PatternsSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FacetCount {
  readonly count: number;
  readonly value: string;
}

interface PatternsSidebarProps {
  readonly activeCategory: string | null;
  readonly categories: readonly FacetCount[];
  readonly className?: string;
  readonly onCategoryChange: (category: string | null) => void;
  readonly onClearAll: () => void;
}

export function PatternsSidebar({
  categories,
  activeCategory,
  onCategoryChange,
  onClearAll,
  className,
}: PatternsSidebarProps) {
  const hasActiveFilters = activeCategory !== null;

  return (
    <aside className={cn("w-full shrink-0 md:w-60", className)}>
      <div className="sticky top-20 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-sm">
            <Filter className="h-4 w-4" />
            Filters
          </h2>
          {hasActiveFilters && (
            <Button
              className="h-7 text-xs"
              onClick={onClearAll}
              size="sm"
              variant="ghost"
            >
              <X className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>

        {/* Search */}
        <PatternsSearch />

        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Category
            </h3>
            <div className="space-y-1">
              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  activeCategory === null
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => onCategoryChange(null)}
                type="button"
              >
                <span>All</span>
                <Badge className="text-xs" variant="secondary">
                  {categories.reduce((sum, cat) => sum + cat.count, 0)}
                </Badge>
              </button>
              {categories.map((cat) => (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    activeCategory === cat.value
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  key={cat.value}
                  onClick={() =>
                    onCategoryChange(
                      cat.value === activeCategory ? null : cat.value
                    )
                  }
                  type="button"
                >
                  <span className="truncate text-foreground">{cat.value}</span>
                  <Badge className="ml-2 shrink-0 text-xs" variant="secondary">
                    {cat.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
