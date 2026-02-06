/**
 * API Keys service helpers.
 */

import { randomBytes, createHash } from "node:crypto"
import {
  DEFAULT_API_KEY_PEPPER,
  API_KEY_RANDOM_BYTES,
  API_KEY_PREFIX,
} from "@/types/constants"

function getPepper(): string {
  return process.env.API_KEY_PEPPER ?? DEFAULT_API_KEY_PEPPER
}

/**
 * Hash a token with SHA-256 + server pepper.
 * NOTE: For v1 this is sufficient. Upgrade to Argon2/bcrypt for production.
 */
export function hashToken(token: string): string {
  return createHash("sha256")
    .update(token + getPepper())
    .digest("hex")
}

/**
 * Generate a new API key token.
 * Format: ek_<40 random hex characters>
 */
export function generateToken(): string {
  const random = randomBytes(API_KEY_RANDOM_BYTES).toString("hex")
  return `${API_KEY_PREFIX}${random}`
}
