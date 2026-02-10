/**
 * Blog: list slugs and get post content from content/blog/*.mdx using effect-mdx.
 */

import path from "node:path"
import { readdir } from "node:fs/promises"
import { Effect, Layer } from "effect"
import { NodeFileSystem } from "@effect/platform-node"
import { MdxService, MdxServiceLive, defaultMdxConfigLayer } from "effect-mdx"

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

/**
 * List all blog post slugs (filename without .mdx).
 */
export async function listBlogSlugs(): Promise<readonly string[]> {
  let entries: string[]
  try {
    entries = await readdir(BLOG_DIR)
  } catch {
    return []
  }
  return entries
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => name.replace(/\.mdx$/, ""))
    .filter((slug) => slug.length > 0)
}

export interface BlogPostMeta {
  readonly slug: string
  readonly title: string
  readonly date: string
  readonly excerpt?: string
}

export interface BlogPost extends BlogPostMeta {
  readonly html: string
}

const MdxLayer = MdxServiceLive.pipe(
  Layer.provide(Layer.merge(NodeFileSystem.layer, defaultMdxConfigLayer))
)

function getFrontmatterValue(
  frontmatter: Record<string, unknown>,
  key: string
): string | undefined {
  const v = frontmatter[key]
  return typeof v === "string" ? v : undefined
}

/**
 * Load a single post by slug. Returns null if file missing or invalid.
 */
export function getBlogPost(slug: string): Effect.Effect<BlogPost | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)

  const program = Effect.gen(function* () {
    const mdx = yield* MdxService
    const { frontmatter, mdxBody } = yield* mdx.readMdxAndFrontmatter(filePath)
    const html = yield* mdx.compileMdxToHtml(mdxBody)
    const attrs = frontmatter as Record<string, unknown>
    const title = getFrontmatterValue(attrs, "title") ?? "Untitled"
    const date = getFrontmatterValue(attrs, "date") ?? ""
    const excerpt = getFrontmatterValue(attrs, "excerpt")
    return {
      slug,
      title,
      date,
      excerpt,
      html,
    }
  }).pipe(
    Effect.provide(MdxLayer),
    Effect.catchAll(() => Effect.succeed(null))
  )

  return program
}

/**
 * Load frontmatter only for listing (read + parse, no compile).
 */
export function getBlogPostMeta(slug: string): Effect.Effect<BlogPostMeta | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)

  const program = Effect.gen(function* () {
    const mdx = yield* MdxService
    const { frontmatter } = yield* mdx.readMdxAndFrontmatter(filePath)
    const attrs = frontmatter as Record<string, unknown>
    const title = getFrontmatterValue(attrs, "title") ?? "Untitled"
    const date = getFrontmatterValue(attrs, "date") ?? ""
    const excerpt = getFrontmatterValue(attrs, "excerpt")
    return { slug, title, date, excerpt }
  }).pipe(
    Effect.provide(MdxLayer),
    Effect.catchAll(() => Effect.succeed(null))
  )

  return program
}

/**
 * List all posts with metadata, newest first (by date string).
 */
export function listBlogPosts(): Effect.Effect<readonly BlogPostMeta[]> {
  return Effect.gen(function* () {
    const slugs = yield* Effect.promise(() => listBlogSlugs())
    const results = yield* Effect.all(
      slugs.map((slug) => getBlogPostMeta(slug)),
      { concurrency: "unbounded" }
    )
    const metas = results.filter((m): m is BlogPostMeta => m !== null)
    metas.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0))
    return metas
  })
}
