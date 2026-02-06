import { TabsBar } from "@/components/TabsBar"
import { Badge } from "@/components/ui/badge"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "EffectPatterns CLI",
  description: "Install and use the EffectPatterns CLI to search, browse, and apply Effect.ts patterns from your terminal.",
})

export default function CliPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">EffectPatterns CLI</h1>
        <p className="text-muted-foreground mb-8">
          Search, browse, and apply Effect.ts patterns directly from your terminal.
        </p>

        {/* Installation */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Installation</h2>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <p className="text-muted-foreground mb-1"># Install globally</p>
            <p>npx effectpatterns@latest</p>
            <br />
            <p className="text-muted-foreground mb-1"># Or with bun</p>
            <p>bunx effectpatterns@latest</p>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Usage</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                Search patterns
                <Badge variant="outline">effectpatterns search</Badge>
              </h3>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>effectpatterns search &quot;error handling&quot;</p>
                <p>effectpatterns search --category=beginner</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                View a pattern
                <Badge variant="outline">effectpatterns show</Badge>
              </h3>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>effectpatterns show retry-with-backoff</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                List all patterns
                <Badge variant="outline">effectpatterns list</Badge>
              </h3>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>effectpatterns list</p>
                <p>effectpatterns list --category=intermediate</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                Browse rules
                <Badge variant="outline">effectpatterns rules</Badge>
              </h3>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>effectpatterns rules</p>
                <p>effectpatterns rules show prefer-gen-over-pipe</p>
              </div>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Configuration</h2>
          <p className="text-muted-foreground mb-3">
            Optionally set your API key for higher rate limits:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <p>effectpatterns config set api-key YOUR_KEY</p>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Generate an API key from your{" "}
            <a href="/settings/api-keys" className="underline hover:text-foreground">
              account settings
            </a>.
          </p>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Requirements</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Node.js 18+ or Bun 1.0+</li>
            <li>Internet connection (fetches from EffectTalk API)</li>
          </ul>
        </section>
      </div>
    </>
  )
}
