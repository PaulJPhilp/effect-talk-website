import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SitePage } from "@/lib/pagesIndex";
import type { Pattern, Rule } from "@/services/BackendApi";

interface GroupedSearchResultsProps {
  readonly pages: readonly SitePage[];
  readonly patterns: readonly Pattern[];
  readonly query: string;
  readonly rules: readonly Rule[];
}

export function GroupedSearchResults({
  query,
  patterns,
  rules,
  pages,
}: GroupedSearchResultsProps) {
  const totalResults = patterns.length + rules.length + pages.length;

  if (totalResults === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground text-sm">
        {totalResults} result{totalResults === 1 ? "" : "s"} for &ldquo;{query}
        &rdquo;
      </p>

      {/* Patterns group */}
      {patterns.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold text-lg">Patterns</h2>
            <Badge variant="secondary">{patterns.length}</Badge>
          </div>
          <div className="grid gap-2">
            {patterns.map((pattern) => (
              <Link href={`/patterns/${pattern.id}`} key={pattern.id}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{pattern.title}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">
                      {pattern.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Rules group */}
      {rules.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold text-lg">Rules</h2>
            <Badge variant="secondary">{rules.length}</Badge>
          </div>
          <div className="grid gap-2">
            {rules.map((rule) => (
              <Link href={`/rules/${rule.id}`} key={rule.id}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{rule.title}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">
                      {rule.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pages group */}
      {pages.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold text-lg">Pages</h2>
            <Badge variant="secondary">{pages.length}</Badge>
          </div>
          <div className="grid gap-2">
            {pages.map((page) => (
              <Link href={page.href} key={page.href}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{page.title}</CardTitle>
                    <CardDescription className="line-clamp-1 text-xs">
                      {page.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
