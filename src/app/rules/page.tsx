import { Effect } from "effect";
import { RulesList } from "@/components/RulesList";
import { buildMetadata } from "@/lib/seo";
import { fetchRules } from "@/services/BackendApi";

export const metadata = buildMetadata({
  title: "Effect.ts Rules",
  description:
    "Browse Effect.ts rules for code quality, best practices, and consistent patterns.",
});

/**
 * Revalidate rules index every 5 minutes.
 */
export const revalidate = 300;

export default async function RulesPage() {
  const rules = await Effect.runPromise(
    fetchRules().pipe(Effect.catchAll(() => Effect.succeed([] as const)))
  );

  return (
    <div className="container px-4 py-10 md:px-6">
      <div className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">Rules</h1>
        <p className="mt-1 text-muted-foreground">
          {rules.length} Effect.ts rules for code quality and best practices
        </p>
      </div>
      <RulesList rules={rules} />
    </div>
  );
}
