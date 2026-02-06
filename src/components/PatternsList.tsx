import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Pattern } from "@/services/BackendApi"

interface PatternsListProps {
  readonly patterns: readonly Pattern[]
}

export function PatternsList({ patterns }: PatternsListProps) {
  if (patterns.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No patterns found.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {patterns.map((pattern) => (
        <Link key={pattern.id} href={`/patterns/${pattern.id}`}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{pattern.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {pattern.description}
                  </CardDescription>
                </div>
                <div className="flex gap-1 shrink-0">
                  {pattern.difficulty && (
                    <Badge variant="outline" className="text-xs">
                      {pattern.difficulty}
                    </Badge>
                  )}
                  {pattern.category && (
                    <Badge variant="secondary" className="text-xs">
                      {pattern.category}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
