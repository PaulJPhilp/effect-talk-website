import { Effect } from "effect"
import { PatternsBrowser } from "@/components/PatternsBrowser"
import { fetchPatterns } from "@/services/BackendApi"
import { getCurrentUser } from "@/services/Auth"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Effect.ts Patterns",
  description: "Browse 300+ production-ready Effect.ts patterns — searchable, categorized, and battle-tested.",
})

/**
 * Revalidate patterns index every 5 minutes.
 */
export const revalidate = 300

const DB_DOCS_HINT =
  "Check that DATABASE_URL points to the shared database and that the database has the effect_patterns table. See "
const DB_CHECK_CMD = "bun run db:check"

export default async function PatternsPage() {
  const [result, currentUser] = await Promise.all([
    Effect.runPromise(
      fetchPatterns().pipe(
        Effect.match({
          onFailure: (e) => ({ patterns: [] as const, loadError: e.message }),
          onSuccess: (patterns) => ({ patterns, loadError: undefined as string | undefined }),
        })
      )
    ),
    getCurrentUser(),
  ])

  const { patterns, loadError } = result

  return (
    <div className="container px-4 md:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Patterns</h1>
        <p className="text-muted-foreground mt-1">
          {patterns.length} production-ready Effect.ts patterns
        </p>
      </div>

      {loadError !== undefined ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">Could not load patterns.</p>
          <p className="mt-1 text-muted-foreground">
            {DB_DOCS_HINT}
            <code className="rounded bg-muted px-1">docs/database.md</code>. You can run{" "}
            <code className="rounded bg-muted px-1">{DB_CHECK_CMD}</code> to verify.
          </p>
          <p className="mt-2 text-muted-foreground">Error: {loadError}</p>
        </div>
      ) : (
        <PatternsBrowser
          patterns={patterns}
          isLoggedIn={Boolean(currentUser)}
          emptyStateHint={
            patterns.length === 0 ? (
              <p className="text-muted-foreground">
                No patterns in database. If you expect patterns, ensure DATABASE_URL points to the
                shared database. See{" "}
                <code className="rounded bg-muted px-1">docs/database.md</code>. Run{" "}
                <code className="rounded bg-muted px-1">{DB_CHECK_CMD}</code> to verify.
              </p>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
