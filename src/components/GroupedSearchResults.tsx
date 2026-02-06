import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Pattern, Rule } from "@/services/BackendApi"
import type { SitePage } from "@/lib/pagesIndex"

interface GroupedSearchResultsProps {
  readonly query: string
  readonly patterns: readonly Pattern[]
  readonly rules: readonly Rule[]
  readonly pages: readonly SitePage[]
}

export function GroupedSearchResults({
  query,
  patterns,
  rules,
  pages,
}: GroupedSearchResultsProps) {
  const totalResults = patterns.length + rules.length + pages.length

  if (totalResults === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
      </p>

      {/* Patterns group */}
      {patterns.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">Patterns</h2>
            <Badge variant="secondary">{patterns.length}</Badge>
          </div>
          <div className="grid gap-2">
            {patterns.map((pattern) => (
              <Link key={pattern.id} href={`/patterns/${pattern.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{pattern.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
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
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">Rules</h2>
            <Badge variant="secondary">{rules.length}</Badge>
          </div>
          <div className="grid gap-2">
            {rules.map((rule) => (
              <Link key={rule.id} href={`/rules/${rule.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{rule.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
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
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold">Pages</h2>
            <Badge variant="secondary">{pages.length}</Badge>
          </div>
          <div className="grid gap-2">
            {pages.map((page) => (
              <Link key={page.href} href={page.href}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{page.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
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
  )
}
