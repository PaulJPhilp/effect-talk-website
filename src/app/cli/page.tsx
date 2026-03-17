import { TabsBar } from "@/components/TabsBar";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "EffectPatterns CLI",
  description:
    "Install and use the EffectPatterns CLI (ep) to search, browse, and install Effect.ts patterns from your terminal.",
});

export default function CliPage() {
  return (
    <>
      <TabsBar />
      <div className="container max-w-3xl px-4 py-10 md:px-6">
        <h1 className="mb-2 font-bold text-3xl tracking-tight">
          EffectPatterns CLI
        </h1>
        <p className="mb-8 text-muted-foreground">
          Search, browse, and install Effect.ts patterns from your terminal
          using{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">ep</code>.
        </p>

        {/* Installation */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Installation</h2>
          <p className="mb-3 text-muted-foreground">
            Install the CLI globally:
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            <p className="mb-1 text-muted-foreground">
              # Install globally with bun (recommended)
            </p>
            <p>bun add -g @effect-patterns/ep-cli</p>
            <br />
            <p className="mb-1 text-muted-foreground"># Or with npm</p>
            <p>npm install -g @effect-patterns/ep-cli</p>
          </div>
          <p className="mt-2 text-muted-foreground text-sm">
            Verify: <code className="rounded bg-muted px-1">ep --version</code>
          </p>
        </section>

        {/* Quick start */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Quick start</h2>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            <p className="mb-1 text-muted-foreground">
              # List available patterns
            </p>
            <p>ep list</p>
            <br />
            <p className="mb-1 text-muted-foreground"># Search by keyword</p>
            <p>ep search &quot;retry&quot;</p>
            <br />
            <p className="mb-1 text-muted-foreground">
              # Show one pattern in detail
            </p>
            <p>ep show retry-with-backoff</p>
            <br />
            <p className="mb-1 text-muted-foreground">
              # See supported install targets
            </p>
            <p>ep install list</p>
          </div>
        </section>

        {/* Command surface */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Command surface</h2>
          <p className="mb-3 text-muted-foreground">
            Public commands currently supported:
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            <p>ep search</p>
            <p>ep list</p>
            <p>ep show</p>
            <p>ep install add</p>
            <p>ep install list</p>
            <p>ep skills list</p>
            <p>ep skills preview</p>
            <p>ep skills validate</p>
            <p>ep skills stats</p>
            <p>ep login</p>
          </div>
        </section>

        {/* Usage */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Usage</h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                Authenticate
                <Badge variant="outline">ep login</Badge>
              </h3>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <p>ep login</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                Pattern discovery
                <Badge variant="outline">ep search / list / show</Badge>
              </h3>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <p>ep search &quot;error handling&quot;</p>
                <p>ep list --difficulty beginner --category error-handling</p>
                <p>ep show retry-with-backoff</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                Install rules into AI tools
                <Badge variant="outline">ep install</Badge>
              </h3>
              <p className="mb-2 text-muted-foreground text-sm">
                Each tool gets its native format. Rules are split into category
                files (up to 16) so your editor only loads relevant patterns.
              </p>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <p className="mb-1 text-muted-foreground">
                  # Cursor — .mdc files with YAML frontmatter
                </p>
                <p>ep install add --tool cursor</p>
                <p className="mb-2 text-muted-foreground text-xs">
                  → .cursor/rules/effect-*.mdc
                </p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Windsurf — same .mdc format
                </p>
                <p>ep install add --tool windsurf</p>
                <p className="mb-2 text-muted-foreground text-xs">
                  → .windsurf/rules/effect-*.mdc
                </p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # VS Code / Copilot — single aggregated markdown
                </p>
                <p>ep install add --tool vscode</p>
                <p className="mb-2 text-muted-foreground text-xs">
                  → .github/copilot-instructions.md
                </p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Claude Code — .md skill files
                </p>
                <p>ep install add --tool claude</p>
                <p className="mb-2 text-muted-foreground text-xs">
                  → .claude/skills/effect-*.md
                </p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Agent — managed section in AGENTS.md
                </p>
                <p>ep install add --tool agent</p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Filter by skill level or use case
                </p>
                <p>
                  ep install add --tool cursor --skill-level intermediate
                  --use-case error-handling
                </p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Interactive selection
                </p>
                <p>ep install add --tool windsurf -i</p>
                <br />
                <p>ep install list</p>
              </div>
              <div className="mt-3 space-y-1 text-muted-foreground text-sm">
                <p>
                  <strong>Cursor / Windsurf:</strong> Each{" "}
                  <code className="rounded bg-muted px-1">.mdc</code> file
                  includes YAML frontmatter (
                  <code className="rounded bg-muted px-1">description</code>,{" "}
                  <code className="rounded bg-muted px-1">globs</code>,{" "}
                  <code className="rounded bg-muted px-1">alwaysApply</code>) so
                  your editor can conditionally activate rules.
                </p>
                <p>
                  <strong>VS Code / Copilot:</strong> All categories are
                  combined into a single{" "}
                  <code className="rounded bg-muted px-1">
                    .github/copilot-instructions.md
                  </code>{" "}
                  file (the Copilot convention).
                </p>
                <p>
                  <strong>Claude Code:</strong> Plain{" "}
                  <code className="rounded bg-muted px-1">.md</code> skill
                  files, one per category.
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                Skills
                <Badge variant="outline">ep skills</Badge>
              </h3>
              <p className="mb-2 text-muted-foreground text-sm">
                Inspect and validate local skill files from your workspace.
                Skills are organized into 16 categories that map directly to the
                files created by{" "}
                <code className="rounded bg-muted px-1">ep install add</code>.
              </p>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <p className="mb-1 text-muted-foreground">
                  # List all skill categories and metadata
                </p>
                <p>ep skills list</p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Preview the full content of a category
                </p>
                <p>ep skills preview error-management</p>
                <p>ep skills preview concurrency</p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Validate structure of all skill files
                </p>
                <p>ep skills validate</p>
                <br />
                <p className="mb-1 text-muted-foreground">
                  # Aggregate stats across all skills
                </p>
                <p>ep skills stats</p>
                <p>ep skills stats --json</p>
              </div>
              <div className="mt-3 space-y-2 text-muted-foreground text-sm">
                <p>
                  <strong>16 categories:</strong> Building APIs, Concurrency,
                  Core Concepts, Data Pipelines, Domain Modeling, Error
                  Management, Getting Started, HTTP Requests, Observability,
                  Platform, Resource Management, Schema, Scheduling, Streams,
                  Testing, Tooling &amp; Debugging.
                </p>
                <p>
                  Each category becomes a separate file when you run{" "}
                  <code className="rounded bg-muted px-1">ep install add</code>{" "}
                  for any of the supported tools above (Cursor, Windsurf, VS
                  Code, Claude, Agent). See <em>Install rules into AI tools</em>{" "}
                  for the output format per tool.
                </p>
                <p>
                  Rules within each category are tagged by skill level
                  (beginner, intermediate, advanced) and use case, so you can
                  filter with{" "}
                  <code className="rounded bg-muted px-1">--skill-level</code>{" "}
                  and <code className="rounded bg-muted px-1">--use-case</code>{" "}
                  during install.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">Configuration</h2>
          <p className="mb-3 text-muted-foreground">
            Pattern API key resolution order:
          </p>
          <ul className="mb-3 list-inside list-disc space-y-1 text-muted-foreground text-sm">
            <li>
              Environment variable:{" "}
              <code className="rounded bg-muted px-1">PATTERN_API_KEY</code>
            </li>
            <li>
              API key file path:{" "}
              <code className="rounded bg-muted px-1">EP_API_KEY_FILE</code>
            </li>
            <li>
              Config JSON via{" "}
              <code className="rounded bg-muted px-1">EP_CONFIG_FILE</code> (or
              default{" "}
              <code className="rounded bg-muted px-1">
                ~/.config/ep-cli/config.json
              </code>
              ) with{" "}
              <code className="rounded bg-muted px-1">{`{"apiKey":"..."}`}</code>
            </li>
            <li>
              One-off secure (no shell history):{" "}
              <code className="rounded bg-muted px-1">
                printf &apos;%s&apos; &quot;$PATTERN_API_KEY&quot; | ep
                --api-key-stdin search &quot;retry&quot;
              </code>
            </li>
          </ul>
          <p className="text-muted-foreground text-sm">
            Generate an API key from your{" "}
            <a
              className="underline hover:text-foreground"
              href="/settings/api-keys"
            >
              account settings
            </a>
            .
          </p>
          <div className="mt-4 rounded-lg bg-muted p-4 font-mono text-sm">
            <p className="mb-1 text-muted-foreground"># Useful env vars</p>
            <p>EP_AUTH_URL=https://effecttalk.dev/cli/auth</p>
            <p>
              EFFECT_PATTERNS_API_URL=https://effect-patterns-mcp-server-buddybuilder.vercel.app
            </p>
            <p>EP_SKILLS_DIR=/path/to/skills</p>
          </div>
        </section>

        {/* JSON + troubleshooting */}
        <section className="mb-10">
          <h2 className="mb-3 font-semibold text-xl">
            JSON output and troubleshooting
          </h2>
          <div className="mb-3 rounded-lg bg-muted p-4 font-mono text-sm">
            <p>ep search &quot;layer&quot; --json</p>
            <p>ep install list --json</p>
            <p>ep skills stats --json</p>
            <p>LOG_LEVEL=debug ep skills stats</p>
          </div>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
            <li>401 unauthorized: ensure one API key source is configured.</li>
            <li>
              Skills not found: run from the workspace root or set{" "}
              <code className="rounded bg-muted px-1">EP_SKILLS_DIR</code>.
            </li>
            <li>
              Need machine-readable output: use{" "}
              <code className="rounded bg-muted px-1">--json</code> on supported
              read commands.
            </li>
          </ul>
        </section>

        {/* Requirements */}
        <section>
          <h2 className="mb-3 font-semibold text-xl">Requirements</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>Bun 1.0+ (recommended) or Node.js with npm</li>
            <li>Internet connection (fetches from the Effect Patterns API)</li>
          </ul>
        </section>
      </div>
    </>
  );
}
