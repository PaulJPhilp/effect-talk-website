/**
 * PostHog analytics service API.
 *
 * Server-side event capture and user identification via `posthog-node`.
 * Errors in capture/identify/flush are swallowed so analytics never
 * blocks the caller. Falls back to a no-op when env vars are unset.
 *
 * @module PostHog/api
 */

import { Effect } from "effect"
import type { PostHogError } from "@/services/PostHog/types"
import { PostHogAnalytics } from "@/services/PostHog/service"

/** Service interface for server-side PostHog analytics. */
export interface PostHogAnalyticsService {
  /** Capture a named event with optional properties. */
  readonly capture: (
    event: string,
    properties?: Record<string, unknown>,
    distinctId?: string
  ) => Effect.Effect<void, PostHogError>
  /** Identify a user with optional traits. */
  readonly identify: (
    distinctId: string,
    traits?: Record<string, unknown>
  ) => Effect.Effect<void, PostHogError>
  /** Flush queued events to PostHog. */
  readonly flush: () => Effect.Effect<void, PostHogError>
}

/**
 * Capture a PostHog event.
 */
export const capture = (event: string, properties?: Record<string, unknown>, distinctId?: string) =>
  Effect.gen(function* () {
    const svc = yield* PostHogAnalytics
    return yield* svc.capture(event, properties, distinctId)
  }).pipe(Effect.provide(PostHogAnalytics.Default))

/**
 * Identify a user in PostHog.
 */
export const identify = (distinctId: string, traits?: Record<string, unknown>) =>
  Effect.gen(function* () {
    const svc = yield* PostHogAnalytics
    return yield* svc.identify(distinctId, traits)
  }).pipe(Effect.provide(PostHogAnalytics.Default))

/**
 * Flush PostHog events.
 */
export const flush = () =>
  Effect.gen(function* () {
    const svc = yield* PostHogAnalytics
    return yield* svc.flush()
  }).pipe(Effect.provide(PostHogAnalytics.Default))
