import { TabsBar } from "@/components/TabsBar"
import { Badge } from "@/components/ui/badge"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "EffectPatterns MCP Server",
  description: "Connect your AI assistant to EffectPatterns via the MCP (Model Context Protocol) server.",
})

export default function McpPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          EffectPatterns MCP Server
        </h1>
        <p className="text-muted-foreground mb-8">
          Give your AI assistant access to the full EffectPatterns library via the
          Model Context Protocol (MCP).
        </p>

        {/* What is MCP */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What is MCP?</h2>
          <p className="text-muted-foreground">
            The Model Context Protocol (MCP) is a standard for connecting AI
            assistants to external data sources and tools. The EffectPatterns MCP
            server exposes patterns, rules, and search as tools that any
            MCP-compatible client can use.
          </p>
        </section>

        {/* Supported Clients */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Supported Clients</h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Cursor</Badge>
            <Badge>Claude Desktop</Badge>
            <Badge>Windsurf</Badge>
            <Badge>Any MCP Client</Badge>
          </div>
        </section>

        {/* Setup */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Setup</h2>

          <h3 className="font-medium mb-2">1. Cursor</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Add to your <code className="bg-muted px-1 rounded">.cursor/mcp.json</code>:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm mb-6">
            <pre>{`{
  "mcpServers": {
    "effectpatterns": {
      "command": "npx",
      "args": ["-y", "effectpatterns-mcp@latest"]
    }
  }
}`}</pre>
          </div>

          <h3 className="font-medium mb-2">2. Claude Desktop</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Add to your Claude Desktop config:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm mb-6">
            <pre>{`{
  "mcpServers": {
    "effectpatterns": {
      "command": "npx",
      "args": ["-y", "effectpatterns-mcp@latest"]
    }
  }
}`}</pre>
          </div>
        </section>

        {/* Available Tools */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Available Tools</h2>
          <div className="space-y-3">
            {[
              {
                name: "search_patterns",
                desc: "Search for Effect.ts patterns by keyword or category.",
              },
              {
                name: "get_pattern",
                desc: "Retrieve the full content of a specific pattern by ID.",
              },
              {
                name: "list_patterns",
                desc: "List all available patterns, optionally filtered by category.",
              },
              {
                name: "search_rules",
                desc: "Search for Effect.ts rules by keyword.",
              },
              {
                name: "get_rule",
                desc: "Retrieve the full content of a specific rule by ID.",
              },
            ].map((tool) => (
              <div key={tool.name} className="flex items-start gap-3">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono whitespace-nowrap">
                  {tool.name}
                </code>
                <p className="text-sm text-muted-foreground">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* API Key */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Authentication (Optional)</h2>
          <p className="text-muted-foreground mb-3">
            Set an API key for higher rate limits:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <pre>{`{
  "mcpServers": {
    "effectpatterns": {
      "command": "npx",
      "args": ["-y", "effectpatterns-mcp@latest"],
      "env": {
        "EFFECTPATTERNS_API_KEY": "ek_your_key_here"
      }
    }
  }
}`}</pre>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Generate an API key from your{" "}
            <a href="/settings/api-keys" className="underline hover:text-foreground">
              account settings
            </a>.
          </p>
        </section>
      </div>
    </>
  )
}
