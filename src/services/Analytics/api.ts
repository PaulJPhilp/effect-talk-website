/**
 * Analytics service API.
 *
 * Fire-and-forget analytics events stored in the `analytics_events` table.
 * Errors are logged but never propagated to the caller (error channel is `never`).
 *
 * @module Analytics/api
 */

import { Effect } from "effect"
import type { AnalyticsEvent } from "@/services/Analytics/types"
import { Analytics } from "@/services/Analytics/service"

/** Service interface for analytics tracking. */
export interface AnalyticsService {
  /** Track an analytics event. Failures are swallowed and logged. */
  readonly trackEvent: (event: AnalyticsEvent) => Effect.Effect<void, never>
}

/**
 * Track an analytics event. Fires and forgets — errors are logged but don't
 * propagate to the caller.
 */
export const trackEvent = (event: AnalyticsEvent) =>
  Effect.gen(function* () {
    const svc = yield* Analytics
    return yield* svc.trackEvent(event)
  }).pipe(Effect.provide(Analytics.Default))
