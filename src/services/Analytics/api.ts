/**
 * Analytics service API.
 *
 * Tracks events:
 * - waitlist_submitted (source)
 * - consulting_submitted
 * - tab_clicked (cli|mcp|playground|code-review)
 * - search_performed (q length + group result counts; avoids storing raw q)
 */

import { Effect } from "effect"
import { insertAnalyticsEvent } from "../Db/api"
import type { DbError } from "../Db/errors"
import type { AnalyticsEvent } from "./types"

/**
 * Track an analytics event. Fires and forgets — errors are logged but don't
 * propagate to the caller.
 */
export function trackEvent(event: AnalyticsEvent): Effect.Effect<void, never> {
  const { type, ...payload } = event
  return insertAnalyticsEvent(type, payload as Record<string, unknown>).pipe(
    Effect.catchAll((error: DbError) =>
      Effect.logWarning(`Analytics tracking failed: ${error.message}`).pipe(
        Effect.map(() => undefined)
      )
    )
  )
}
