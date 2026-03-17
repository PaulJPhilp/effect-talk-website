import { Effect } from "effect";
import { GroupedSearchResults } from "@/components/GroupedSearchResults";
import { searchPages } from "@/lib/pagesIndex";
import { buildMetadata } from "@/lib/seo";
import { searchBackend } from "@/services/BackendApi";

export const metadata = buildMetadata({
  title: "Search",
  description: "Search patterns, rules, and pages across EffectTalk.",
});

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  if (!query) {
    return (
      <div className="container px-4 py-10 md:px-6">
        <h1 className="mb-4 font-bold text-3xl tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Enter a search term to find patterns, rules, and pages.
        </p>
      </div>
    );
  }

  // Fetch patterns and rules from backend, pages from local index
  const backendResult = await Effect.runPromise(
    searchBackend(query).pipe(
      Effect.catchAll(() =>
        Effect.succeed({ patterns: [], rules: [] } as const)
      )
    )
  );

  const pages = searchPages(query);

  // Track search analytics (fire and forget)
  try {
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "search_performed",
        queryLength: query.length,
        patternCount: backendResult.patterns.length,
        ruleCount: backendResult.rules.length,
        pageCount: pages.length,
      }),
    }).catch(() => {
      // Silently ignore analytics failures
    });
  } catch {
    // Silently ignore
  }

  return (
    <div className="container px-4 py-10 md:px-6">
      <h1 className="mb-6 font-bold text-3xl tracking-tight">Search</h1>
      <GroupedSearchResults
        pages={pages}
        patterns={backendResult.patterns}
        query={query}
        rules={backendResult.rules}
      />
    </div>
  );
}
