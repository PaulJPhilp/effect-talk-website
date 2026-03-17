import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { difficultyDisplayLabel } from "@/lib/difficulty";
import type { Pattern } from "@/services/BackendApi";

interface PatternsListProps {
  readonly patterns: readonly Pattern[];
}

export function PatternsList({ patterns }: PatternsListProps) {
  if (patterns.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No patterns found.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {patterns.map((pattern) => (
        <Link href={`/patterns/${pattern.id}`} key={pattern.id}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{pattern.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {pattern.description}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  {pattern.difficulty && (
                    <Badge className="text-xs" variant="outline">
                      {difficultyDisplayLabel(pattern.difficulty)}
                    </Badge>
                  )}
                  {pattern.category && (
                    <Badge className="text-xs" variant="secondary">
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
  );
}
