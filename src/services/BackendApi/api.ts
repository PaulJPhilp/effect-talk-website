/**
 * Effect service to call the backend HTTP API for patterns and rules.
 *
 * The backend exposes:
 *   GET /patterns         -> { patterns: Pattern[] }
 *   GET /patterns/:id     -> Pattern
 *   GET /rules            -> { rules: Rule[] }
 *   GET /rules/:id        -> Rule
 *   GET /search?q=...     -> { patterns: Pattern[], rules: Rule[] }
 *
 * Assumption: Backend API shape is as above. Adjust if actual API differs.
 */

import { Effect } from "effect"
import { BackendApiError } from "@/services/BackendApi/errors"
import type { Pattern, Rule, SearchResult } from "@/services/BackendApi/types"
import { apiFetch } from "@/services/BackendApi/helpers"

// ---------------------------------------------------------------------------
// Public API (Effect wrappers)
// ---------------------------------------------------------------------------

export function fetchPatterns(): Effect.Effect<readonly Pattern[], BackendApiError> {
  return Effect.tryPromise({
    try: async () => {
      const data = await apiFetch<{ patterns: Pattern[] }>("/patterns")
      return data.patterns
    },
    catch: (error) =>
      new BackendApiError({
        message: error instanceof Error ? error.message : "Failed to fetch patterns",
      }),
  })
}

export function fetchPattern(id: string): Effect.Effect<Pattern, BackendApiError> {
  return Effect.tryPromise({
    try: () => apiFetch<Pattern>(`/patterns/${encodeURIComponent(id)}`),
    catch: (error) =>
      new BackendApiError({
        message: error instanceof Error ? error.message : `Failed to fetch pattern ${id}`,
      }),
  })
}

export function fetchRules(): Effect.Effect<readonly Rule[], BackendApiError> {
  return Effect.tryPromise({
    try: async () => {
      const data = await apiFetch<{ rules: Rule[] }>("/rules")
      return data.rules
    },
    catch: (error) =>
      new BackendApiError({
        message: error instanceof Error ? error.message : "Failed to fetch rules",
      }),
  })
}

export function fetchRule(id: string): Effect.Effect<Rule, BackendApiError> {
  return Effect.tryPromise({
    try: () => apiFetch<Rule>(`/rules/${encodeURIComponent(id)}`),
    catch: (error) =>
      new BackendApiError({
        message: error instanceof Error ? error.message : `Failed to fetch rule ${id}`,
      }),
  })
}

export function searchBackend(q: string): Effect.Effect<SearchResult, BackendApiError> {
  return Effect.tryPromise({
    try: () => apiFetch<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
    catch: (error) =>
      new BackendApiError({
        message: error instanceof Error ? error.message : "Search failed",
      }),
  })
}

/**
 * Fetch all pattern IDs (for generateStaticParams in ISR).
 */
export function fetchPatternIds(): Effect.Effect<readonly string[], BackendApiError> {
  return fetchPatterns().pipe(Effect.map((ps) => ps.map((p) => p.id)))
}

/**
 * Fetch all rule IDs (for generateStaticParams in ISR).
 */
export function fetchRuleIds(): Effect.Effect<readonly string[], BackendApiError> {
  return fetchRules().pipe(Effect.map((rs) => rs.map((r) => r.id)))
}
