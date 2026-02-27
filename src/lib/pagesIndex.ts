/**
 * Static list of site pages used for the "Pages" group in search results.
 */

export interface SitePage {
  readonly title: string
  readonly href: string
  readonly description: string
}

export const sitePages: readonly SitePage[] = [
  {
    title: "Home",
    href: "/",
    description: "EffectTalk — Production-ready Effect.ts patterns, tools, and consulting.",
  },
  {
    title: "EffectPatterns CLI",
    href: "/cli",
    description: "Install and use the EffectPatterns CLI to search, browse, and install Effect.ts patterns from your terminal.",
  },
  {
    title: "EffectPatterns MCP Server",
    href: "/mcp",
    description: "Connect your AI assistant to EffectPatterns via the MCP server.",
  },
  {
    title: "EffectPatterns Playground",
    href: "/playground",
    description: "Interactive playground for experimenting with Effect.ts patterns.",
  },
  {
    title: "EffectTalk Code Review",
    href: "/code-review",
    description: "AI-powered code review for Effect.ts applications.",
  },
  {
    title: "Patterns",
    href: "/patterns",
    description: "Browse all Effect.ts patterns — searchable, categorized, and production-tested.",
  },
  {
    title: "Rules",
    href: "/rules",
    description: "Browse all Effect.ts rules for code quality and best practices.",
  },
  {
    title: "Consulting",
    href: "/consulting",
    description: "Effect.ts consulting — assessments, migration strategy, and developer training.",
  },
  {
    title: "Search",
    href: "/search",
    description: "Search patterns, rules, and pages across EffectTalk.",
  },
  {
    title: "Settings",
    href: "/settings",
    description: "Manage your EffectTalk account settings.",
  },
] as const

/**
 * Simple text search over site pages.
 */
export function searchPages(query: string): readonly SitePage[] {
  const q = query.toLowerCase()
  return sitePages.filter(
    (page) =>
      page.title.toLowerCase().includes(q) ||
      page.description.toLowerCase().includes(q)
  )
}
