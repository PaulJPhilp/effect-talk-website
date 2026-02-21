/**
 * Unit tests for Analytics service API.
 *
 * Tests the Analytics service interface via NoOp layers.
 * The error-swallowing behavior (DbError → void) is verified by the type
 * system: AnalyticsService.trackEvent returns Effect<void, never>.
 */

import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { Analytics, AnalyticsNoOp } from "@/services/Analytics/service"

describe("Analytics api", () => {
  it("trackEvent succeeds for waitlist event", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* Analytics
      return yield* svc.trackEvent({ type: "waitlist_submitted", source: "playground" })
    })
    const result = await Effect.runPromise(program.pipe(Effect.provide(AnalyticsNoOp)))
    expect(result).toBeUndefined()
  })

  it("trackEvent succeeds for consulting event", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* Analytics
      return yield* svc.trackEvent({ type: "consulting_submitted" })
    })
    const result = await Effect.runPromise(program.pipe(Effect.provide(AnalyticsNoOp)))
    expect(result).toBeUndefined()
  })

  it("trackEvent succeeds for all event types", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* Analytics
      yield* svc.trackEvent({ type: "feedback_submitted" })
      yield* svc.trackEvent({ type: "tour_started" })
      yield* svc.trackEvent({ type: "lesson_started", lessonSlug: "intro" })
      yield* svc.trackEvent({ type: "step_completed", lessonSlug: "intro", stepId: "s1" })
      yield* svc.trackEvent({ type: "lesson_completed", lessonSlug: "intro" })
    })
    await Effect.runPromise(program.pipe(Effect.provide(AnalyticsNoOp)))
  })
})
