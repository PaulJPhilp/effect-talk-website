/**
 * Email service helpers.
 * If RESEND_API_KEY is unset, Resend client is still created but sends will fail;
 * consulting/waitlist routes catch and log, and DB insert still succeeds (no confirmation email).
 * See docs/deployment.md for production setup.
 */

import { Resend } from "resend"

export function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY)
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// ── Email template builders (pure functions) ──────────────────────

import {
  EMAIL_FROM_ADDRESS,
  FEEDBACK_RECIPIENT_EMAIL,
  EMAIL_PATTERNS_LINK,
  BUSINESS_DAYS_RESPONSE_TIME,
  PRODUCT_NAME_PLAYGROUND,
  PRODUCT_NAME_CODE_REVIEW,
} from "@/types/constants"
import type { WaitlistSource } from "@/types/strings"

export interface EmailMessage {
  readonly from: string
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly replyTo?: string
}

export function buildWaitlistEmail(email: string, source: WaitlistSource): EmailMessage {
  const productName = source === "playground" ? PRODUCT_NAME_PLAYGROUND : PRODUCT_NAME_CODE_REVIEW
  return {
    from: EMAIL_FROM_ADDRESS,
    to: email,
    subject: `You're on the waitlist for ${productName}!`,
    html: `
                <h2>Welcome to the ${productName} waitlist!</h2>
                <p>Thanks for signing up. We'll notify you as soon as ${productName} is available.</p>
                <p>In the meantime, check out our <a href="${EMAIL_PATTERNS_LINK}">Effect.ts patterns</a>.</p>
                <br/>
                <p>— The EffectTalk Team</p>
              `,
  }
}

export function buildConsultingEmail(email: string, name: string): EmailMessage {
  return {
    from: EMAIL_FROM_ADDRESS,
    to: email,
    subject: "We received your consulting inquiry",
    html: `
                <h2>Hi ${name},</h2>
                <p>Thanks for reaching out about Effect.ts consulting. We'll review your inquiry and get back to you within ${BUSINESS_DAYS_RESPONSE_TIME} business days.</p>
                <br/>
                <p>— The EffectTalk Team</p>
              `,
  }
}

export function buildFeedbackEmail(data: {
  name: string | null
  email: string
  message: string
}): EmailMessage {
  const fromLabel = data.name ? `${data.name} <${data.email}>` : data.email
  return {
    from: EMAIL_FROM_ADDRESS,
    to: FEEDBACK_RECIPIENT_EMAIL,
    replyTo: data.email,
    subject: `[EffectTalk] Feedback from ${data.name ?? "Anonymous"}`,
    html: `
                <h2>New feedback</h2>
                <p><strong>From:</strong> ${escapeHtml(fromLabel)}</p>
                <p><strong>Message:</strong></p>
                <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(data.message)}</pre>
              `,
  }
}
