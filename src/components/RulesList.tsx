import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Rule } from "@/services/BackendApi"

interface RulesListProps {
  readonly rules: readonly Rule[]
}

export function RulesList({ rules }: RulesListProps) {
  if (rules.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No rules found.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {rules.map((rule) => (
        <Link key={rule.id} href={`/rules/${rule.id}`}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{rule.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {rule.description}
                  </CardDescription>
                </div>
                <div className="flex gap-1 shrink-0">
                  {rule.severity && (
                    <Badge variant="outline" className="text-xs">
                      {rule.severity}
                    </Badge>
                  )}
                  {rule.category && (
                    <Badge variant="secondary" className="text-xs">
                      {rule.category}
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
