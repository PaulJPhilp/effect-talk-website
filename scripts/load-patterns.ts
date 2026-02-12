#!/usr/bin/env bun

/**
 * Load patterns & rules from the Effect-Patterns project into STAGING tables.
 *
 * Reads from:
 *   - all-patterns.json (index with metadata)
 *   - content/published/patterns/**\/*.mdx (full content with code examples)
 *
 * Usage: bun run scripts/load-patterns.ts
 *
 * After loading, run `bun run db:promote patterns` (and/or `rules`) to swap staging → live.
 */

import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readFile, readdir, stat } from "node:fs/promises"
import { drizzle } from "drizzle-orm/node-postgres"
import { rulesStaging, contentDeployments } from "../src/db/schema"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(rootDir, "..", ".env.local") })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const db = drizzle(databaseUrl)

// ---------------------------------------------------------------------------
// Paths to Effect-Patterns project
// ---------------------------------------------------------------------------

const EFFECT_PATTERNS_ROOT = path.resolve(rootDir, "../../../Public/Effect-Patterns")
const ALL_PATTERNS_JSON = path.join(EFFECT_PATTERNS_ROOT, "packages/mcp-server/data/all-patterns.json")

// ---------------------------------------------------------------------------
// Types for the JSON index
// ---------------------------------------------------------------------------

interface PatternData {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly category: string
  readonly difficulty: string
  readonly tags: string[]
  readonly examples: ReadonlyArray<{
    readonly language: string
    readonly code: string
    readonly description: string
  }>
  readonly useCases: string[]
  readonly effectVersion: string
}

interface PatternsFile {
  readonly version: string
  readonly patterns: PatternData[]
  readonly lastUpdated: string
}

function mdxToHtml(mdxContent: string): string {
  // Strip frontmatter
  const withoutFrontmatter = mdxContent.replace(/^---[\s\S]*?---\s*/, "")

  let html = withoutFrontmatter

  // ---------------------------------------------------------------------------
  // Step 1: Extract code blocks into placeholders (protects from later transforms)
  // ---------------------------------------------------------------------------
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .trimEnd()
    const langAttr = lang ? ` class="language-${lang}"` : ""
    const placeholder = `<!--CODE_BLOCK_${codeBlocks.length}-->`
    codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`)
    return placeholder
  })

  // ---------------------------------------------------------------------------
  // Step 2: Strip the first H1 (the page already renders pattern.title as H1)
  // ---------------------------------------------------------------------------
  html = html.replace(/^# .+$/m, "")

  // ---------------------------------------------------------------------------
  // Step 3: Inline transforms (headings, inline code, bold, italic)
  // ---------------------------------------------------------------------------

  // Headings
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>")
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>")

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")

  // ---------------------------------------------------------------------------
  // Step 4: Lists — unordered (- item) and ordered (1. item)
  // ---------------------------------------------------------------------------

  // Ordered lists: consecutive lines starting with `N. `
  html = html.replace(/(?:^\d+\.\s+.+$\n?)+/gm, (block) => {
    const items = block.trim().split("\n").map((line) => {
      const content = line.replace(/^\d+\.\s+/, "")
      return `<li>${content}</li>`
    })
    return `<ol>${items.join("\n")}</ol>`
  })

  // Unordered lists: consecutive lines starting with `- `
  html = html.replace(/(?:^- .+$\n?)+/gm, (block) => {
    const items = block.trim().split("\n").map((line) => {
      const content = line.replace(/^- /, "")
      return `<li>${content}</li>`
    })
    return `<ul>${items.join("\n")}</ul>`
  })

  // ---------------------------------------------------------------------------
  // Step 5: Paragraphs — split on blank lines, skip already-wrapped blocks
  // ---------------------------------------------------------------------------
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ""
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<p") ||
        trimmed.startsWith("<!--CODE_BLOCK_")
      ) {
        return trimmed
      }
      return `<p>${trimmed.replace(/\n/g, " ")}</p>`
    })
    .filter(Boolean)
    .join("\n")

  // ---------------------------------------------------------------------------
  // Step 6: Restore code blocks from placeholders
  // ---------------------------------------------------------------------------
  for (let i = 0; i < codeBlocks.length; i++) {
    html = html.replace(`<!--CODE_BLOCK_${i}-->`, codeBlocks[i])
  }

  return html.trim()
}

// ---------------------------------------------------------------------------
// Seed execution
// ---------------------------------------------------------------------------

async function seed() {
  // Read JSON index
  try {
    const raw = await readFile(ALL_PATTERNS_JSON, "utf-8")
    JSON.parse(raw) as PatternsFile
  } catch (err) {
    console.error(`Failed to read ${ALL_PATTERNS_JSON}:`, err)
    console.error("Make sure the Effect-Patterns project exists at:", EFFECT_PATTERNS_ROOT)
    process.exit(1)
  }

  // Patterns: not loaded here. effect_patterns is owned by the other project (sync-patterns-from-mdx).
  // This script only loads rules into rules_staging.

  // Clear rules staging (staging is a scratch space)
  console.log("Clearing rules staging...")
  await db.delete(rulesStaging)

  // Load rules from the content/published/rules directory if it exists
  const rulesDir = path.join(EFFECT_PATTERNS_ROOT, "content/published/rules")
  const rulesDirExists = await stat(rulesDir).catch(() => null)
  let rulesInserted = 0

  if (rulesDirExists?.isDirectory()) {
    const ruleFiles = await readdir(rulesDir)
    const mdxRuleFiles = ruleFiles.filter((f) => f.endsWith(".mdx"))

    for (const file of mdxRuleFiles) {
      const mdxRaw = await readFile(path.join(rulesDir, file), "utf-8")
      const content = mdxToHtml(mdxRaw)

      // Extract frontmatter
      const frontmatterMatch = mdxRaw.match(/^---\n([\s\S]*?)\n---/)
      const fm = frontmatterMatch ? frontmatterMatch[1] : ""

      const titleMatch = fm.match(/^title:\s*(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : file.replace(".mdx", "")

      const summaryMatch = fm.match(/summary:\s*>-?\s*([\s\S]*?)(?=\n\w|\n---)/m)
      const description = summaryMatch ? summaryMatch[1].trim().replace(/\n\s+/g, " ") : title

      const tagsMatch = fm.match(/tags:\s*\n((?:\s+-\s+.+\n?)*)/m)
      const tags = tagsMatch
        ? tagsMatch[1].match(/- (.+)/g)?.map((t) => t.replace(/^- /, "").trim()) ?? []
        : []

      const categoryMatch = fm.match(/applicationPatternId:\s*(.+)$/m)
      const category = categoryMatch ? categoryMatch[1].trim() : "general"

      try {
        await db.insert(rulesStaging).values({
          title,
          description,
          content,
          category,
          severity: "warning",
          tags,
        })
        rulesInserted++
      } catch (err) {
        console.error(`  Failed to insert rule "${title}":`, err)
      }
    }
    console.log(`Staged ${rulesInserted} rules`)
  } else {
    console.log("No rules directory found, skipping rules")
  }

  // Record deployment for rules only (patterns/effect_patterns not managed by this script)
  await db.insert(contentDeployments).values({
    tableGroup: "rules",
    status: "staged",
    rowCount: rulesInserted,
    metadata: {},
  })

  console.log("\nStaging complete! To promote rules to live, run:")
  console.log("  bun run db:promote rules")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
