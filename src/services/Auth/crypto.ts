/**
 * Pure cryptographic helpers for session cookie signing/verification.
 *
 * Extracted from service.ts so they can be unit-tested without
 * importing Next.js or WorkOS modules.
 *
 * @module Auth/crypto
 */

import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_TOKEN_SEPARATOR = "."

/**
 * Reads session signing secret from env.
 * Prefers SESSION_COOKIE_SECRET, falls back to WORKOS_COOKIE_PASSWORD.
 * Returns null if missing or shorter than 32 characters.
 */
export function getSessionSigningSecret(): string | null {
  const secret = process.env.SESSION_COOKIE_SECRET ?? process.env.WORKOS_COOKIE_PASSWORD
  if (!secret || secret.length < 32) return null
  return secret
}

/**
 * HMAC-SHA256 signs a value, returning `value.signature` (base64url).
 */
export function signSessionValue(value: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(value).digest("base64url")
  return `${value}${SESSION_TOKEN_SEPARATOR}${signature}`
}

/**
 * Verifies a signed value. Returns the original value on success, null on failure.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifySessionValue(signedValue: string, secret: string): string | null {
  const separatorIndex = signedValue.lastIndexOf(SESSION_TOKEN_SEPARATOR)
  if (separatorIndex <= 0) return null

  const value = signedValue.slice(0, separatorIndex)
  const signature = signedValue.slice(separatorIndex + 1)
  const expectedSignature = createHmac("sha256", secret).update(value).digest("base64url")

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) return null

  return timingSafeEqual(signatureBuffer, expectedBuffer) ? value : null
}
