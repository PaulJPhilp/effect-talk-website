"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeHighlight } from "@/components/CodeHighlight";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { difficultyDisplayLabel } from "@/lib/difficulty";
import { getCachedPatternSections } from "@/lib/extractPatternSections";
import { measureSync } from "@/lib/pattern-browser-perf";
import type { Pattern } from "@/services/BackendApi";

interface PatternCardProps {
  readonly isBookmarked?: boolean;
  readonly onToggleBookmark?: (patternId: string) => void;
  readonly pattern: Pattern;
}

function PatternCardInner({
  pattern,
  isBookmarked,
  onToggleBookmark,
}: PatternCardProps) {
  const sections = useMemo(
    () =>
      measureSync("cardExtractSectionsMs", () =>
        getCachedPatternSections(pattern.id, pattern.content)
      ),
    [pattern.id, pattern.content]
  );

  const goalText = sections.goal?.text ?? null;
  const patternCode = sections.pattern?.codeBlocks[0] ?? null;
  const antiPatternCode = sections.antiPattern?.codeBlocks[0] ?? null;

  // Fallback: if we have neither pattern nor anti-pattern code,
  // show the first code block from any section
  const fallbackCode =
    patternCode || antiPatternCode
      ? null
      : (sections.allSections.flatMap((s) => s.codeBlocks)[0] ?? null);

  const hasCodePreviews = patternCode || antiPatternCode || fallbackCode;

  const handleBookmarkClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleBookmark?.(pattern.id);
    },
    [pattern.id, onToggleBookmark]
  );

  return (
    <Link
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={`/patterns/${pattern.id}`}
    >
      <Card className="group h-full gap-4 py-4 transition-all duration-200 hover:bg-muted/50 hover:shadow-md">
        {/* Header: category labels on top, then title + description */}
        <CardHeader className="relative pt-1 pb-1">
          {onToggleBookmark && (
            <button
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              className="absolute top-1 right-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
              onClick={handleBookmarkClick}
              type="button"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          )}
          {(pattern.new || pattern.difficulty || pattern.category) && (
            <div className="mb-1 flex flex-wrap gap-1 pr-6">
              {pattern.new && (
                <Badge
                  className="border-success/50 bg-success/10 text-success text-xs"
                  variant="outline"
                >
                  New
                </Badge>
              )}
              {pattern.difficulty && (
                <Badge
                  className="border-tag-level/50 bg-tag-level/10 text-tag-level text-xs"
                  variant="outline"
                >
                  {difficultyDisplayLabel(pattern.difficulty)}
                </Badge>
              )}
              {pattern.category && (
                <Badge
                  className="border-tag-category/50 bg-tag-category/10 text-tag-category text-xs"
                  variant="outline"
                >
                  {pattern.category}
                </Badge>
              )}
            </div>
          )}
          <CardTitle className="text-sm transition-colors group-hover:text-primary">
            {pattern.title}
          </CardTitle>
          <CardDescription className="mt-0.5 line-clamp-1 text-xs">
            {pattern.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {/* Goal / background text */}
          {goalText && (
            <div className="mt-1">
              <p className="mb-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Goal
              </p>
              <p className="line-clamp-2 text-foreground/80 text-xs leading-snug">
                {goalText}
              </p>
            </div>
          )}

          {/* Code previews: Pattern and Anti-Pattern side by side */}
          {hasCodePreviews && (
            <div className="grid grid-cols-1 gap-2">
              {/* Pattern (the good way) */}
              {patternCode && (
                <CodePreviewBlock
                  code={patternCode.code}
                  label="Pattern"
                  language={patternCode.language}
                  variant="good"
                />
              )}

              {/* Anti-Pattern (the bad way) */}
              {antiPatternCode && (
                <CodePreviewBlock
                  code={antiPatternCode.code}
                  label="Anti-Pattern"
                  language={antiPatternCode.language}
                  variant="bad"
                />
              )}

              {/* Fallback: first code block when no explicit sections match */}
              {fallbackCode && (
                <CodePreviewBlock
                  code={fallbackCode.code}
                  label="Example"
                  language={fallbackCode.language}
                  variant="good"
                />
              )}
            </div>
          )}
        </CardContent>

        {/* Tags footer */}
        {pattern.tags && pattern.tags.length > 0 && (
          <CardFooter className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {pattern.tags.map((tag) => (
                <Badge
                  className="font-normal text-xs"
                  key={tag}
                  variant="outline"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}

export const PatternCard = memo(PatternCardInner);

// ---------------------------------------------------------------------------
// Code preview block sub-component (lazy: only render highlight when in view)
// ---------------------------------------------------------------------------

interface CodePreviewBlockProps {
  readonly code: string;
  readonly label: string;
  readonly language: string | null;
  readonly variant: "good" | "bad";
}

function CodePreviewBlock({
  label,
  variant,
  code,
  language,
}: CodePreviewBlockProps) {
  const borderColor =
    variant === "good" ? "border-l-success/60" : "border-l-destructive/60";

  const labelColor = variant === "good" ? "text-success" : "text-destructive";

  const dotColor = variant === "good" ? "bg-success" : "bg-destructive";

  return (
    <div
      className={`relative rounded-md border border-l-[3px] ${borderColor} flex min-h-0 flex-col overflow-hidden bg-muted/50`}
    >
      {/* Label */}
      <div className="flex shrink-0 items-center gap-1.5 px-2.5 pt-2 pb-1">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <span
          className={`font-semibold text-[10px] uppercase tracking-wider ${labelColor}`}
        >
          {label}
        </span>
      </div>

      {/* Code block: defer highlight until in view to reduce initial JS cost */}
      <div className="overflow-x-auto px-2.5 pb-2.5">
        <LazyCodeHighlight
          className="text-[10px] leading-snug"
          code={code}
          language={language}
        />
      </div>
    </div>
  );
}

interface LazyCodeHighlightProps {
  readonly className?: string;
  readonly code: string;
  readonly language: string | null;
}

function LazyCodeHighlight({
  code,
  language,
  className,
}: LazyCodeHighlightProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: "100px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ minHeight: "2.5rem" }}>
      {isVisible ? (
        <CodeHighlight className={className} code={code} language={language} />
      ) : (
        <pre className="font-mono text-muted-foreground text-xs">…</pre>
      )}
    </div>
  );
}
