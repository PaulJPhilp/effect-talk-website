/**
 * Analytics Effect.Service implementation.
 *
 * Delegates to {@link Db} to insert analytics events. Db errors are caught
 * and logged as warnings so callers are never blocked by analytics failures.
 *
 * @module Analytics/service
 */

import { Effect, Layer } from "effect"
import { insertAnalyticsEvent } from "@/services/Db/api"
import type { DbError } from "@/services/Db/errors"
import type { AnalyticsEvent } from "@/services/Analytics/types"
import type { AnalyticsService } from "@/services/Analytics/api"

export class Analytics extends Effect.Service<AnalyticsService>()("Analytics", {
  effect: Effect.gen(function* () {
    return {
      trackEvent: (event: AnalyticsEvent) => {
        const { type, ...payload } = event
        return insertAnalyticsEvent(type, payload as Record<string, unknown>).pipe(
          Effect.catchAll((error: DbError) =>
            Effect.logWarning(`Analytics tracking failed: ${error.message}`).pipe(
              Effect.map(() => undefined)
            )
          )
        )
      },
    } satisfies AnalyticsService
  }),
}) {}

/** No-op implementation for tests. */
export const AnalyticsNoOp = Layer.succeed(Analytics, {
  trackEvent: () => Effect.void,
})
