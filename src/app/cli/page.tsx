import { TabsBar } from "@/components/TabsBar"
import { Badge } from "@/components/ui/badge"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "EffectPatterns CLI",
  description:
    "Install and use the EffectPatterns CLI (ep) to search, browse, and install Effect.ts patterns from your terminal.",
})

export default function CliPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          EffectPatterns CLI
        </h1>
        <p className="text-muted-foreground mb-8">
          Search, browse, and install Effect.ts patterns from your terminal using{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">ep</code>.
        </p>

        {/* Installation */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Installation</h2>
          <p className="text-muted-foreground mb-3">
            Requires Bun. Install the CLI globally:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <p>bun add -g @effect-patterns/ep-cli</p>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Verify: <code className="bg-muted px-1 rounded">ep --version</code>
          </p>
        </section>

        {/* Quick start */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Quick start</h2>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <p className="text-muted-foreground mb-1"># List available patterns</p>
            <p>ep list</p>
            <br />
            <p className="text-muted-foreground mb-1"># Search by keyword</p>
            <p>ep search &quot;retry&quot;</p>
            <br />
            <p className="text-muted-foreground mb-1"># Show one pattern in detail</p>
            <p>ep show retry-with-backoff</p>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Usage</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                Pattern discovery
                <Badge variant="outline">ep search / list / show</Badge>
              </h3>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>ep search &quot;error handling&quot;</p>
                <p>ep list --difficulty beginner --category error-handling</p>
                <p>ep show retry-with-backoff</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                Install rules into AI tools
                <Badge variant="outline">ep install</Badge>
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Supported tools: <code className="bg-muted px-1 rounded">agents</code>,{" "}
                <code className="bg-muted px-1 rounded">cursor</code>,{" "}
                <code className="bg-muted px-1 rounded">vscode</code>,{" "}
                <code className="bg-muted px-1 rounded">windsurf</code>
              </p>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>ep install add --tool cursor</p>
                <p>ep install add --tool cursor --skill-level intermediate --use-case error-handling</p>
                <p>ep install add --tool windsurf -i</p>
                <p>ep install list</p>
                <p>ep install list --installed</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                Skills (local Claude Skills)
                <Badge variant="outline">ep skills</Badge>
              </h3>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <p>ep skills list</p>
                <p>ep skills preview error-management</p>
                <p>ep skills validate</p>
                <p>ep skills stats</p>
              </div>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Configuration</h2>
          <p className="text-muted-foreground mb-3">
            For higher rate limits, set an API key using one of these methods:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-3 text-sm">
            <li>
              Environment: <code className="bg-muted px-1 rounded">PATTERN_API_KEY=your_key</code>
            </li>
            <li>
              Config file: <code className="bg-muted px-1 rounded">~/.config/ep-cli/config.json</code> with{" "}
              <code className="bg-muted px-1 rounded">{`{"apiKey":"..."}`}</code> (override with{" "}
              <code className="bg-muted px-1 rounded">EP_CONFIG_FILE</code>)
            </li>
            <li>
              One-off secure (no shell history):{" "}
              <code className="bg-muted px-1 rounded">printf &apos;%s&apos; &quot;$KEY&quot; | ep --api-key-stdin search &quot;retry&quot;</code>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Generate an API key from your{" "}
            <a href="/settings/api-keys" className="underline hover:text-foreground">
              account settings
            </a>
            .
          </p>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Requirements</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Bun 1.0+</li>
            <li>Internet connection (fetches from Effect Patterns API)</li>
          </ul>
        </section>
      </div>
    </>
  )
}
