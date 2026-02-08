/**
 * API Key management service API.
 *
 * Key format: ek_<random 40 hex chars>
 * Storage: Only keyPrefix (first 10 chars) and keyHash are stored.
 * Hashing: SHA-256(token + serverPepper) — acceptable for v1.
 *
 * For production, consider upgrading to bcrypt or Argon2 KDF.
 */

import { Effect } from "effect"
import { API_KEY_PREFIX_LENGTH } from "@/types/constants"
import { insertApiKey, listApiKeys, revokeApiKey } from "@/services/Db/api"
import type { DbApiKey } from "@/services/Db/types"
import { ApiKeyError } from "@/services/ApiKeys/errors"
import type { CreatedApiKey } from "@/services/ApiKeys/types"
import { hashToken, generateToken } from "@/services/ApiKeys/helpers"

/**
 * Create a new API key for a user.
 * Returns the plaintext key (shown once) and the DB record.
 */
export function createApiKey(
  userId: string,
  name: string
): Effect.Effect<CreatedApiKey, ApiKeyError> {
  return Effect.gen(function* () {
    const token = generateToken()
    const keyPrefix = token.slice(0, API_KEY_PREFIX_LENGTH)
    const keyHash = hashToken(token)

    const record = yield* insertApiKey({
      userId,
      name,
      keyPrefix,
      keyHash,
    }).pipe(
      Effect.mapError((e) => new ApiKeyError({ message: e.message }))
    )

    return { plaintext: token, record }
  })
}

/**
 * List all API keys for a user.
 */
export function listUserApiKeys(
  userId: string
): Effect.Effect<readonly DbApiKey[], ApiKeyError> {
  return listApiKeys(userId).pipe(
    Effect.mapError((e) => new ApiKeyError({ message: e.message }))
  )
}

/**
 * Revoke an API key (soft delete by setting revoked_at).
 */
export function revokeUserApiKey(
  keyId: string,
  userId: string
): Effect.Effect<DbApiKey | null, ApiKeyError> {
  return revokeApiKey(keyId, userId).pipe(
    Effect.mapError((e) => new ApiKeyError({ message: e.message }))
  )
}

/**
 * Verify a plaintext API key against stored hash.
 * Returns true if valid, false otherwise.
 */
export function verifyApiKey(token: string, storedHash: string): boolean {
  return hashToken(token) === storedHash
}
