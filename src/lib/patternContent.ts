/**
 * Convert raw pattern content (MDX with optional frontmatter) to HTML for display.
 * Uses effect-mdx to compile; strips frontmatter before compile.
 */

import { Effect, Layer } from "effect"
import { NodeFileSystem } from "@effect/platform-node"
import { MdxService, MdxServiceLive, defaultMdxConfigLayer } from "effect-mdx"

const MdxLayer = MdxServiceLive.pipe(
  Layer.provide(Layer.merge(NodeFileSystem.layer, defaultMdxConfigLayer))
)

/** Strip YAML frontmatter (--- ... ---) from raw content; return body only. */
export function stripFrontmatter(raw: string): string {
  // Frontmatter at start: ---\n...\n---
  const atStart = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (atStart) return atStart[2].trim()
  // Frontmatter block in middle: first --- ... --- (take content after closing ---)
  const mid = raw.match(/\r?\n---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/)
  if (mid) return mid[1].trim()
  return raw.trim()
}

/**
 * Convert pattern content to HTML. If content looks like raw MDX (has frontmatter or
 * starts with #), strip frontmatter and compile with effect-mdx. Otherwise return as-is (already HTML).
 */
export function patternContentToHtml(content: string): Effect.Effect<string> {
  if (!content || !content.trim()) {
    return Effect.succeed("")
  }

  const trimmed = content.trim()
  const body = stripFrontmatter(content)
  const hadFrontmatter = body !== trimmed
  const isLikelyMdx =
    hadFrontmatter ||
    trimmed.startsWith("---") ||
    (trimmed.startsWith("#") && !trimmed.startsWith("<!"))

  if (!isLikelyMdx) {
    return Effect.succeed(content)
  }

  return Effect.gen(function* () {
    const mdx = yield* MdxService
    return yield* mdx.compileMdxToHtml(body)
  }).pipe(
    Effect.provide(MdxLayer),
    Effect.catchAll(() => Effect.succeed(content))
  )
}
