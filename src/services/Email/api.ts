/**
 * Email service API.
 *
 * Transactional emails sent via Resend (waitlist confirmation, consulting
 * inquiry confirmation, feedback notification to the site owner).
 *
 * @module Email/api
 */

import { Effect } from "effect"
import type { WaitlistSource } from "@/types/strings"
import type { EmailError } from "@/services/Email/errors"
import { Email } from "@/services/Email/service"

/** Service interface for transactional email operations. */
export interface EmailService {
  /** Send a waitlist confirmation email to the subscriber. */
  readonly sendWaitlistConfirmation: (email: string, source: WaitlistSource) => Effect.Effect<void, EmailError>
  /** Send a consulting inquiry confirmation email. */
  readonly sendConsultingConfirmation: (email: string, name: string) => Effect.Effect<void, EmailError>
  /** Send a feedback notification email to the site owner. */
  readonly sendFeedbackNotification: (data: {
    name: string | null
    email: string
    message: string
  }) => Effect.Effect<void, EmailError>
}

/**
 * Send a waitlist confirmation email.
 */
export const sendWaitlistConfirmation = (email: string, source: WaitlistSource) =>
  Effect.gen(function* () {
    const svc = yield* Email
    return yield* svc.sendWaitlistConfirmation(email, source)
  }).pipe(Effect.provide(Email.Default))

/**
 * Send a consulting inquiry confirmation email.
 */
export const sendConsultingConfirmation = (email: string, name: string) =>
  Effect.gen(function* () {
    const svc = yield* Email
    return yield* svc.sendConsultingConfirmation(email, name)
  }).pipe(Effect.provide(Email.Default))

/**
 * Send a feedback notification email to the site owner.
 */
export const sendFeedbackNotification = (data: {
  name: string | null
  email: string
  message: string
}) =>
  Effect.gen(function* () {
    const svc = yield* Email
    return yield* svc.sendFeedbackNotification(data)
  }).pipe(Effect.provide(Email.Default))
