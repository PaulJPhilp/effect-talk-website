"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildTourHref,
  getAccessibleTourMode,
  isTourModeAvailable,
  TOUR_MODE_OPTIONS,
} from "@/lib/tourMode";
import { cn } from "@/lib/utils";

interface TourModeSwitcherProps {
  readonly className?: string;
  readonly isLoggedIn: boolean;
}

export function TourModeSwitcher({
  className,
  isLoggedIn,
}: TourModeSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMode = getAccessibleTourMode(
    searchParams.get("mode"),
    isLoggedIn
  );

  return (
    <nav
      aria-label="Tour mode"
      className={cn("inline-flex flex-wrap items-center gap-2", className)}
    >
      {TOUR_MODE_OPTIONS.map((option) => {
        const isActive = option.value === currentMode;
        const isAvailable = isTourModeAvailable(option.value, isLoggedIn);

        if (!isAvailable) {
          return (
            <button
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center rounded-full border border-border/70 bg-muted px-3 py-1.5 font-medium text-muted-foreground/70 text-sm"
              disabled
              key={option.value}
              type="button"
            >
              {option.label}
            </button>
          );
        }

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 font-medium text-sm transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
            href={buildTourHref(pathname, searchParams, { mode: option.value })}
            key={option.value}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
