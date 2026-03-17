import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Rule } from "@/services/BackendApi";

interface RulesListProps {
  readonly rules: readonly Rule[];
}

export function RulesList({ rules }: RulesListProps) {
  if (rules.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No rules found.</p>
    );
  }

  return (
    <div className="grid gap-3">
      {rules.map((rule) => (
        <Link href={`/rules/${rule.id}`} key={rule.id}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{rule.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {rule.description}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  {rule.severity && (
                    <Badge className="text-xs" variant="outline">
                      {rule.severity}
                    </Badge>
                  )}
                  {rule.category && (
                    <Badge className="text-xs" variant="secondary">
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
  );
}
