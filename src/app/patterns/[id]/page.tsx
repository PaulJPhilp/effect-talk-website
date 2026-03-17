import { Effect } from "effect";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatternContent } from "@/components/PatternContent";
import { Badge } from "@/components/ui/badge";
import { difficultyDisplayLabel } from "@/lib/difficulty";
import { patternContentToHtml } from "@/lib/patternContent";
import { buildMetadata } from "@/lib/seo";
import { fetchPattern, fetchPatternIds } from "@/services/BackendApi";

/**
 * ISR: revalidate pattern detail pages every 5 minutes.
 */
export const revalidate = 300;

/**
 * Pre-generate static params from the backend API.
 * Falls back gracefully if the backend is unreachable during build.
 */
export async function generateStaticParams() {
  const ids = await Effect.runPromise(
    fetchPatternIds().pipe(
      Effect.catchAll(() => Effect.succeed([] as readonly string[]))
    )
  );
  return ids.map((id) => ({ id }));
}

interface PatternPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; step?: string }>;
}

export async function generateMetadata({
  params,
}: PatternPageProps): Promise<Metadata> {
  const { id } = await params;
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(Effect.catchAll(() => Effect.succeed(null)))
  );

  if (!pattern) {
    return buildMetadata({ title: "Pattern Not Found" });
  }

  return buildMetadata({
    title: pattern.title,
    description: pattern.description,
  });
}

export default async function PatternDetailPage({
  params,
  searchParams,
}: PatternPageProps) {
  const { id } = await params;
  const { from: lessonSlug, step: stepParam } = await searchParams;
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(Effect.catchAll(() => Effect.succeed(null)))
  );

  if (!pattern) {
    notFound();
  }

  const contentHtml = await Effect.runPromise(
    patternContentToHtml(pattern.content)
  );

  const backHref =
    lessonSlug && stepParam
      ? `/tour/${lessonSlug}?step=${stepParam}`
      : lessonSlug
        ? `/tour/${lessonSlug}`
        : "/tour";

  return (
    <div className="container max-w-3xl px-4 py-10 md:px-6">
      <Link
        className="mb-6 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        href={backHref}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Tour
      </Link>

      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {pattern.new && (
            <Badge
              className="border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              variant="outline"
            >
              New
            </Badge>
          )}
          {pattern.category && (
            <Badge variant="secondary">{pattern.category}</Badge>
          )}
          {pattern.difficulty && (
            <Badge variant="outline">
              {difficultyDisplayLabel(pattern.difficulty)}
            </Badge>
          )}
        </div>
        <h1 className="font-bold text-3xl tracking-tight">{pattern.title}</h1>
        <p className="mt-2 text-muted-foreground">{pattern.description}</p>
      </div>

      {/* Pattern content with syntax-highlighted code blocks */}
      <PatternContent html={contentHtml} />
    </div>
  );
}
