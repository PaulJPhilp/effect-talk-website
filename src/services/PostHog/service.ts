/**
 * PostHog analytics Effect.Service implementation.
 *
 * Lazily imports `posthog-node` and creates a client when
 * `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are set.
 * Returns a no-op implementation otherwise. All errors are caught
 * internally so analytics never disrupts the caller.
 *
 * @module PostHog/service
 */

import { Effect, Layer } from "effect"
import { PostHogError } from "@/services/PostHog/types"
import type { PostHogAnalyticsService } from "@/services/PostHog/api"

const SERVER_DISTINCT_ID = "server"

const noOpImpl: PostHogAnalyticsService = {
  capture: () => Effect.void,
  identify: () => Effect.void,
  flush: () => Effect.void,
}

export class PostHogAnalytics extends Effect.Service<PostHogAnalyticsService>()(
  "PostHogAnalytics",
  {
    effect: Effect.gen(function* () {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
      if (!key || !host) {
        if (process.env.NODE_ENV === "development") {
          console.info("[PostHog] Disabled: NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST not set.")
        }
        return noOpImpl
      }
      const { PostHog } = yield* Effect.tryPromise({
        try: () => import("posthog-node"),
        catch: (e) => new PostHogError({ message: String(e), cause: e }),
      })
      const client = new PostHog(key, {
        host,
        flushAt: 1,
        flushInterval: 0,
      })
      return {
        capture: (event: string, properties?: Record<string, unknown>, distinctId?: string) =>
          Effect.tryPromise({
            try: () =>
              Promise.resolve(
                client.capture({
                  distinctId: distinctId ?? SERVER_DISTINCT_ID,
                  event,
                  properties: properties ?? {},
                })
              ),
            catch: (e) => new PostHogError({ message: String(e), cause: e }),
          }).pipe(Effect.catchAll(() => Effect.void)),

        identify: (distinctId: string, traits?: Record<string, unknown>) =>
          Effect.tryPromise({
            try: () =>
              Promise.resolve(
                client.identify({
                  distinctId,
                  properties: traits ?? {},
                })
              ),
            catch: (e) => new PostHogError({ message: String(e), cause: e }),
          }).pipe(Effect.catchAll(() => Effect.void)),

        flush: () =>
          Effect.tryPromise({
            try: () => client.flush(),
            catch: (e) => new PostHogError({ message: String(e), cause: e }),
          }).pipe(Effect.catchAll(() => Effect.void)),
      } satisfies PostHogAnalyticsService
    }),
  }
) {}

/** No-op implementation for tests. */
export const PostHogAnalyticsNoOp = Layer.succeed(PostHogAnalytics, noOpImpl)
