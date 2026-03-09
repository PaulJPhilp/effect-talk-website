type SearchParamValue = string | readonly string[] | string[] | undefined

export function sanitizeReturnToPath(returnTo: string | null | undefined): string | null {
  if (!returnTo) return null
  if (!returnTo.startsWith("/")) return null
  if (returnTo.startsWith("//")) return null

  return returnTo
}

export function getSafeReturnPath(
  returnTo: string | null | undefined,
  fallback = "/"
): string {
  return sanitizeReturnToPath(returnTo) ?? fallback
}

export function encodeAuthReturnState(returnPathname: string): string {
  return btoa(JSON.stringify({ returnPathname }))
}

export function buildPathWithSearchParams(
  pathname: string,
  searchParams: Record<string, SearchParamValue>
): string {
  const next = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue

    if (typeof value === "string") {
      next.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        next.append(key, entry)
      }
    }
  }

  const query = next.toString()
  return query.length > 0 ? `${pathname}?${query}` : pathname
}
