import { TabsBar } from "@/components/TabsBar"
import { Badge } from "@/components/ui/badge"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "EffectPatterns MCP Server",
  description:
    "Connect your AI assistant to EffectPatterns via the MCP (Model Context Protocol) server.",
})

const MCP_CONFIG_JSON = `{
  "mcpServers": {
    "effect-patterns": {
      "command": "bun",
      "args": ["--cwd", "packages/mcp-server", "dist/mcp-stdio.js"],
      "cwd": "/absolute/path/to/Effect-Patterns",
      "env": {
        "PATTERN_API_KEY": "your-api-key",
        "EFFECT_PATTERNS_API_URL": "https://effect-patterns-mcp.vercel.app"
      }
    }
  }
}`

const MCP_TOOLS = [
  {
    name: "search_patterns",
    desc: "Search the pattern library by keyword, category, and difficulty (params: q, category, difficulty, limit, format).",
  },
  {
    name: "get_pattern",
    desc: "Get full documentation and code examples for a single pattern by ID (params: id, format).",
  },
  {
    name: "list_analysis_rules",
    desc: "List all available code analysis rules (IDs, titles, severity, categories). No parameters.",
  },
  {
    name: "list_skills",
    desc: "Search curated Effect-TS skill guides (params: q, category, limit, format).",
  },
  {
    name: "get_skill",
    desc: "Get the full content of a specific skill guide by slug (params: slug, format).",
  },
] as const

export default function McpPage() {
  return (
    <>
      <TabsBar />
      <div className="container px-4 md:px-6 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          EffectPatterns MCP Server
        </h1>
        <p className="text-muted-foreground mb-8">
          Give your AI assistant access to 700+ Effect.ts patterns via the
          Model Context Protocol (MCP). Production API:{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
            https://effect-patterns-mcp.vercel.app
          </code>
        </p>

        {/* What is MCP */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What is MCP?</h2>
          <p className="text-muted-foreground">
            The Model Context Protocol (MCP) is a standard for connecting AI
            assistants to external data sources and tools. The EffectPatterns MCP
            server exposes patterns, skills, and analysis rules as tools that any
            MCP-compatible client can use.
          </p>
        </section>

        {/* Supported Clients */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Supported Clients</h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Cursor</Badge>
            <Badge>Claude Desktop</Badge>
            <Badge>Claude Code</Badge>
            <Badge>Windsurf</Badge>
            <Badge>Any MCP Client</Badge>
          </div>
        </section>

        {/* Setup */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Setup</h2>
          <p className="text-muted-foreground mb-3">
            The MCP server runs from a local clone of the Effect-Patterns repo
            with Bun. Clone the repo and install dependencies:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm mb-4">
            <p>git clone https://github.com/PaulJPhilp/Effect-Patterns.git</p>
            <p>cd Effect-Patterns</p>
            <p>bun install</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Replace <code className="bg-muted px-1 rounded">/absolute/path/to/Effect-Patterns</code> in the config below with the actual path on your machine.
          </p>

          <h3 className="font-medium mb-2">Cursor</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Open Settings → MCP Servers and add:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm mb-6">
            <pre>{MCP_CONFIG_JSON}</pre>
          </div>

          <h3 className="font-medium mb-2">Claude Desktop</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Open Settings → Developer → Model Context Protocol and add the same
            structure (command, args, cwd, env).
          </p>

          <h3 className="font-medium mb-2">Windsurf</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Create or edit <code className="bg-muted px-1 rounded">.windsurf/mcp_config.json</code> in your project with the same
            structure and add <code className="bg-muted px-1 rounded">&quot;disabled&quot;: false</code> to the server entry.
          </p>
        </section>

        {/* Available Tools */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Available Tools</h2>
          <div className="space-y-3">
            {MCP_TOOLS.map((tool) => (
              <div key={tool.name} className="flex items-start gap-3">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono whitespace-nowrap">
                  {tool.name}
                </code>
                <p className="text-sm text-muted-foreground">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Authentication</h2>
          <p className="text-muted-foreground mb-3">
            The MCP server sends your API key to the hosted API. Set{" "}
            <code className="bg-muted px-1 rounded">PATTERN_API_KEY</code> in the
            server <code className="bg-muted px-1 rounded">env</code> config (as
            in the setup examples above). The key is sent as{" "}
            <code className="bg-muted px-1 rounded">x-api-key</code> on requests.
          </p>
          <p className="text-sm text-muted-foreground">
            Generate an API key from your{" "}
            <a href="/settings/api-keys" className="underline hover:text-foreground">
              account settings
            </a>
            . Never commit API keys to version control.
          </p>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Troubleshooting</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
            <li>
              Health check:{" "}
              <code className="bg-muted px-1 rounded">
                curl https://effect-patterns-mcp.vercel.app/api/health
              </code>
            </li>
            <li>
              Authentication errors: verify <code className="bg-muted px-1 rounded">PATTERN_API_KEY</code> is set in the env your IDE passes to the MCP process.
            </li>
            <li>
              Debug logging: set <code className="bg-muted px-1 rounded">MCP_DEBUG=true</code> in the server env for verbose output on stderr.
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
