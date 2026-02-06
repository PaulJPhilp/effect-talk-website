import type { Metadata } from "next"

const SITE_NAME = "EffectTalk"
const SITE_DESCRIPTION =
  "Production-ready Effect.ts patterns, tools, and consulting for TypeScript teams."

/**
 * Helper to build page-level metadata with sensible defaults.
 */
export function buildMetadata(overrides: {
  title?: string
  description?: string
  noIndex?: boolean
}): Metadata {
  const title = overrides.title
    ? `${overrides.title} | ${SITE_NAME}`
    : SITE_NAME
  const description = overrides.description ?? SITE_DESCRIPTION

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: "website",
    },
    ...(overrides.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
