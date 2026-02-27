/**
 * Email Effect.Service implementation.
 *
 * Uses Resend to deliver transactional emails. HTML templates are inline.
 * All send failures are wrapped in {@link EmailError}.
 *
 * @module Email/service
 */

import { Effect, Layer } from "effect"
import { EmailError } from "@/services/Email/errors"
import {
  getResendClient,
  buildWaitlistEmail,
  buildConsultingEmail,
  buildFeedbackEmail,
} from "@/services/Email/helpers"
import type { EmailService } from "@/services/Email/api"
import type { WaitlistSource } from "@/types/strings"

export class Email extends Effect.Service<EmailService>()("Email", {
  effect: Effect.gen(function* () {
    return {
      sendWaitlistConfirmation: (email: string, source: WaitlistSource) =>
        Effect.tryPromise({
          try: async () => {
            const resend = getResendClient()
            await resend.emails.send(buildWaitlistEmail(email, source))
          },
          catch: (error) =>
            new EmailError({
              message: error instanceof Error ? error.message : "Failed to send email",
            }),
        }),

      sendConsultingConfirmation: (email: string, name: string) =>
        Effect.tryPromise({
          try: async () => {
            const resend = getResendClient()
            await resend.emails.send(buildConsultingEmail(email, name))
          },
          catch: (error) =>
            new EmailError({
              message: error instanceof Error ? error.message : "Failed to send email",
            }),
        }),

      sendFeedbackNotification: (data: { name: string | null; email: string; message: string }) =>
        Effect.tryPromise({
          try: async () => {
            const resend = getResendClient()
            await resend.emails.send(buildFeedbackEmail(data))
          },
          catch: (error) =>
            new EmailError({
              message: error instanceof Error ? error.message : "Failed to send email",
            }),
        }),
    } satisfies EmailService
  }),
}) {}

/** No-op implementation for tests. */
export const EmailNoOp = Layer.succeed(Email, {
  sendWaitlistConfirmation: () => Effect.void,
  sendConsultingConfirmation: () => Effect.void,
  sendFeedbackNotification: () => Effect.void,
})
