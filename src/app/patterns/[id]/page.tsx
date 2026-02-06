import { Effect } from "effect"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { fetchPattern, fetchPatternIds } from "@/services/BackendApi"
import { buildMetadata } from "@/lib/seo"
import type { Metadata } from "next"

/**
 * ISR: revalidate pattern detail pages every 5 minutes.
 */
export const revalidate = 300

/**
 * Pre-generate static params from the backend API.
 * Falls back gracefully if the backend is unreachable during build.
 */
export async function generateStaticParams() {
  const ids = await Effect.runPromise(
    fetchPatternIds().pipe(
      Effect.catchAll(() => Effect.succeed([] as readonly string[]))
    )
  )
  return ids.map((id) => ({ id }))
}

interface PatternPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PatternPageProps): Promise<Metadata> {
  const { id } = await params
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!pattern) {
    return buildMetadata({ title: "Pattern Not Found" })
  }

  return buildMetadata({
    title: pattern.title,
    description: pattern.description,
  })
}

export default async function PatternDetailPage({ params }: PatternPageProps) {
  const { id } = await params
  const pattern = await Effect.runPromise(
    fetchPattern(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!pattern) {
    notFound()
  }

  return (
    <div className="container px-4 md:px-6 py-10 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {pattern.category && (
            <Badge variant="secondary">{pattern.category}</Badge>
          )}
          {pattern.difficulty && (
            <Badge variant="outline">{pattern.difficulty}</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{pattern.title}</h1>
        <p className="text-muted-foreground mt-2">{pattern.description}</p>
      </div>

      {pattern.tags && pattern.tags.length > 0 && (
        <div className="flex gap-1.5 mb-6">
          {pattern.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Pattern content rendered as HTML or markdown */}
      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: pattern.content }}
      />
    </div>
  )
}
