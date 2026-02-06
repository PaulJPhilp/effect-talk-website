import { Effect } from "effect"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { fetchRule, fetchRuleIds } from "@/services/BackendApi"
import { buildMetadata } from "@/lib/seo"
import type { Metadata } from "next"

/**
 * ISR: revalidate rule detail pages every 5 minutes.
 */
export const revalidate = 300

/**
 * Pre-generate static params from the backend API.
 */
export async function generateStaticParams() {
  const ids = await Effect.runPromise(
    fetchRuleIds().pipe(
      Effect.catchAll(() => Effect.succeed([] as readonly string[]))
    )
  )
  return ids.map((id) => ({ id }))
}

interface RulePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: RulePageProps): Promise<Metadata> {
  const { id } = await params
  const rule = await Effect.runPromise(
    fetchRule(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!rule) {
    return buildMetadata({ title: "Rule Not Found" })
  }

  return buildMetadata({
    title: rule.title,
    description: rule.description,
  })
}

export default async function RuleDetailPage({ params }: RulePageProps) {
  const { id } = await params
  const rule = await Effect.runPromise(
    fetchRule(id).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    )
  )

  if (!rule) {
    notFound()
  }

  return (
    <div className="container px-4 md:px-6 py-10 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {rule.category && (
            <Badge variant="secondary">{rule.category}</Badge>
          )}
          {rule.severity && (
            <Badge variant="outline">{rule.severity}</Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{rule.title}</h1>
        <p className="text-muted-foreground mt-2">{rule.description}</p>
      </div>

      {rule.tags && rule.tags.length > 0 && (
        <div className="flex gap-1.5 mb-6">
          {rule.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: rule.content }}
      />
    </div>
  )
}
