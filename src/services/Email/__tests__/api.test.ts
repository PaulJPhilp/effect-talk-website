/**
 * Unit tests for Email service API.
 *
 * Tests the Email service interface via NoOp and custom test layers.
 * No vi.mock, no Resend client stubs.
 */

import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { Email, EmailNoOp } from "@/services/Email/service"
import { EmailError } from "@/services/Email/errors"

describe("Email api", () => {
  describe("sendWaitlistConfirmation", () => {
    it("succeeds with EmailNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Email
        return yield* svc.sendWaitlistConfirmation("user@example.com", "playground")
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(EmailNoOp)))
      expect(result).toBeUndefined()
    })

    it("returns EmailError from a failing layer", async () => {
      const FailingEmail = Layer.succeed(Email, {
        sendWaitlistConfirmation: () => Effect.fail(new EmailError({ message: "Resend API error" })),
        sendConsultingConfirmation: () => Effect.void,
        sendFeedbackNotification: () => Effect.void,
      })
      const program = Effect.gen(function* () {
        const svc = yield* Email
        return yield* svc.sendWaitlistConfirmation("user@example.com", "playground")
      })
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(FailingEmail), Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(EmailError)
        expect(result.left.message).toBe("Resend API error")
      }
    })
  })

  describe("sendConsultingConfirmation", () => {
    it("succeeds with EmailNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Email
        return yield* svc.sendConsultingConfirmation("jane@example.com", "Jane")
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(EmailNoOp)))
      expect(result).toBeUndefined()
    })

    it("returns EmailError from a failing layer", async () => {
      const FailingEmail = Layer.succeed(Email, {
        sendWaitlistConfirmation: () => Effect.void,
        sendConsultingConfirmation: () => Effect.fail(new EmailError({ message: "Network error" })),
        sendFeedbackNotification: () => Effect.void,
      })
      const program = Effect.gen(function* () {
        const svc = yield* Email
        return yield* svc.sendConsultingConfirmation("jane@example.com", "Jane")
      })
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(FailingEmail), Effect.either)
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(EmailError)
      }
    })
  })

  describe("sendFeedbackNotification", () => {
    it("succeeds with EmailNoOp", async () => {
      const program = Effect.gen(function* () {
        const svc = yield* Email
        return yield* svc.sendFeedbackNotification({
          name: "Test",
          email: "test@example.com",
          message: "Great site!",
        })
      })
      const result = await Effect.runPromise(program.pipe(Effect.provide(EmailNoOp)))
      expect(result).toBeUndefined()
    })
  })

  describe("EmailError", () => {
    it("is constructible with message", () => {
      const err = new EmailError({ message: "test" })
      expect(err._tag).toBe("EmailError")
      expect(err.message).toBe("test")
    })
  })
})
