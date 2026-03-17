import { TabsBar } from "@/components/TabsBar";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "EffectPatterns MCP Server",
  description:
    "Connect your AI assistant to EffectPatterns via the MCP (Model Context Protocol) server.",
});

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
}`;

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
] as const;

export default function McpPage() {
  return (
    <>
      <TabsBar />
      <div className="container max-w-3xl px-4 py-10 md:px-6">
        <h1 className="mb-2 font-bold text-3xl tracking-tight">
          EffectPatterns MCP Server
        </h1>
        <p className="mb-8 text-muted-foreground">
          Give your AI assistant access to 700+ Effect.ts patterns via the Model
          Context Protocol (MCP). Production API:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            https://effect-patterns-mcp.vercel.app
          </code>
        </p>

        {/* What is MCP */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">What is MCP?</h2>
          <p className="text-muted-foreground">
            The Model Context Protocol (MCP) is a standard for connecting AI
            assistants to external data sources and tools. The EffectPatterns
            MCP server exposes patterns, skills, and analysis rules as tools
            that any MCP-compatible client can use.
          </p>
        </section>

        {/* Supported Clients */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Supported Clients</h2>
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
          <h2 className="mb-3 font-semibold text-xl">Setup</h2>
          <p className="mb-3 text-muted-foreground">
            The MCP server runs from a local clone of the Effect-Patterns repo
            with Bun. Clone the repo and install dependencies:
          </p>
          <div className="mb-4 rounded-lg bg-muted p-4 font-mono text-sm">
            <p>git clone https://github.com/PaulJPhilp/Effect-Patterns.git</p>
            <p>cd Effect-Patterns</p>
            <p>bun install</p>
          </div>
          <p className="mb-4 text-muted-foreground text-sm">
            Replace{" "}
            <code className="rounded bg-muted px-1">
              /absolute/path/to/Effect-Patterns
            </code>{" "}
            in the config below with the actual path on your machine.
          </p>

          <h3 className="mb-2 font-medium">Cursor</h3>
          <p className="mb-2 text-muted-foreground text-sm">
            Open Settings → MCP Servers and add:
          </p>
          <div className="mb-6 rounded-lg bg-muted p-4 font-mono text-sm">
            <pre>{MCP_CONFIG_JSON}</pre>
          </div>

          <h3 className="mb-2 font-medium">Claude Desktop</h3>
          <p className="mb-2 text-muted-foreground text-sm">
            Open Settings → Developer → Model Context Protocol and add the same
            structure (command, args, cwd, env).
          </p>

          <h3 className="mb-2 font-medium">Windsurf</h3>
          <p className="mb-2 text-muted-foreground text-sm">
            Create or edit{" "}
            <code className="rounded bg-muted px-1">
              .windsurf/mcp_config.json
            </code>{" "}
            in your project with the same structure and add{" "}
            <code className="rounded bg-muted px-1">
              &quot;disabled&quot;: false
            </code>{" "}
            to the server entry.
          </p>
        </section>

        {/* Available Tools */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Available Tools</h2>
          <div className="space-y-3">
            {MCP_TOOLS.map((tool) => (
              <div className="flex items-start gap-3" key={tool.name}>
                <code className="whitespace-nowrap rounded bg-muted px-2 py-1 font-mono text-sm">
                  {tool.name}
                </code>
                <p className="text-muted-foreground text-sm">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Authentication</h2>
          <p className="mb-3 text-muted-foreground">
            The MCP server sends your API key to the hosted API. Set{" "}
            <code className="rounded bg-muted px-1">PATTERN_API_KEY</code> in
            the server <code className="rounded bg-muted px-1">env</code> config
            (as in the setup examples above). The key is sent as{" "}
            <code className="rounded bg-muted px-1">x-api-key</code> on
            requests.
          </p>
          <p className="text-muted-foreground text-sm">
            Generate an API key from your{" "}
            <a
              className="underline hover:text-foreground"
              href="/settings/api-keys"
            >
              account settings
            </a>
            . Never commit API keys to version control.
          </p>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="mb-3 font-semibold text-xl">Troubleshooting</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
            <li>
              Health check:{" "}
              <code className="rounded bg-muted px-1">
                curl https://effect-patterns-mcp.vercel.app/api/health
              </code>
            </li>
            <li>
              Authentication errors: verify{" "}
              <code className="rounded bg-muted px-1">PATTERN_API_KEY</code> is
              set in the env your IDE passes to the MCP process.
            </li>
            <li>
              Debug logging: set{" "}
              <code className="rounded bg-muted px-1">MCP_DEBUG=true</code> in
              the server env for verbose output on stderr.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
