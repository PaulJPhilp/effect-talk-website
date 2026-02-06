import { Effect } from "effect"
import { RulesList } from "@/components/RulesList"
import { fetchRules } from "@/services/BackendApi"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Effect.ts Rules",
  description: "Browse Effect.ts rules for code quality, best practices, and consistent patterns.",
})

/**
 * Revalidate rules index every 5 minutes.
 */
export const revalidate = 300

export default async function RulesPage() {
  const rules = await Effect.runPromise(
    fetchRules().pipe(
      Effect.catchAll(() => Effect.succeed([] as const))
    )
  )

  return (
    <div className="container px-4 md:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
        <p className="text-muted-foreground mt-1">
          {rules.length} Effect.ts rules for code quality and best practices
        </p>
      </div>
      <RulesList rules={rules} />
    </div>
  )
}
