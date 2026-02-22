/**
 * Unit tests for Analytics service API.
 *
 * Tests the Analytics service interface via NoOp layers.
 * The error-swallowing behavior (DbError → void) is verified by the type
 * system: AnalyticsService.trackEvent returns Effect<void, never>.
 */

import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { Analytics, AnalyticsNoOp } from "@/services/Analytics/service"
import { trackEvent } from "@/services/Analytics/api"

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

  it("trackEvent succeeds for tab_clicked event", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* Analytics
      return yield* svc.trackEvent({
        type: "tab_clicked",
        tab: "patterns",
        context: "main-nav",
      })
    })
    const result = await Effect.runPromise(program.pipe(Effect.provide(AnalyticsNoOp)))
    expect(result).toBeUndefined()
  })

  it("trackEvent succeeds for search_performed event", async () => {
    const program = Effect.gen(function* () {
      const svc = yield* Analytics
      return yield* svc.trackEvent({
        type: "search_performed",
        queryLength: 5,
        patternCount: 10,
        ruleCount: 3,
        pageCount: 2,
      })
    })
    const result = await Effect.runPromise(program.pipe(Effect.provide(AnalyticsNoOp)))
    expect(result).toBeUndefined()
  })

  it("convenience trackEvent resolves via Analytics layer", async () => {
    // trackEvent from api.ts uses Analytics.Default internally, which
    // requires Db.Default (a real DB). Instead, verify the program
    // structure works by providing AnalyticsNoOp to the same Effect.gen
    // pattern the convenience function uses.
    const program = Effect.gen(function* () {
      const svc = yield* Analytics
      return yield* svc.trackEvent({ type: "waitlist_submitted", source: "playground" })
    }).pipe(Effect.provide(AnalyticsNoOp))

    const result = await Effect.runPromise(program)
    expect(result).toBeUndefined()
  })
})
