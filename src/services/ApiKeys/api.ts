/**
 * API Key management service API.
 * Interface + backward-compatible convenience functions.
 *
 * Key format: ek_<random 40 hex chars>
 * Storage: Only keyPrefix (first 10 chars) and keyHash are stored.
 * Hashing: SHA-256(token + serverPepper) — acceptable for v1.
 */

import { Effect } from "effect"
import type { DbApiKey } from "@/services/Db/types"
import type { ApiKeyError } from "@/services/ApiKeys/errors"
import type { CreatedApiKey } from "@/services/ApiKeys/types"
import { hashToken } from "@/services/ApiKeys/helpers"
import { ApiKeys } from "@/services/ApiKeys/service"

/** Service interface for API key lifecycle (create, list, revoke). */
export interface ApiKeysService {
  /** Generate a new API key, returning the plaintext (shown once) and the DB record. */
  readonly createApiKey: (userId: string, name: string) => Effect.Effect<CreatedApiKey, ApiKeyError>
  /** List all API keys for a user (active and revoked). */
  readonly listUserApiKeys: (userId: string) => Effect.Effect<readonly DbApiKey[], ApiKeyError>
  /** Soft-revoke an API key by setting `revoked_at`. Returns null if not found. */
  readonly revokeUserApiKey: (keyId: string, userId: string) => Effect.Effect<DbApiKey | null, ApiKeyError>
}

/**
 * Create a new API key for a user.
 * Returns the plaintext key (shown once) and the DB record.
 */
export const createApiKey = (userId: string, name: string) =>
  Effect.gen(function* () {
    const svc = yield* ApiKeys
    return yield* svc.createApiKey(userId, name)
  }).pipe(Effect.provide(ApiKeys.Default))

/**
 * List all API keys for a user.
 */
export const listUserApiKeys = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* ApiKeys
    return yield* svc.listUserApiKeys(userId)
  }).pipe(Effect.provide(ApiKeys.Default))

/**
 * Revoke an API key (soft delete by setting revoked_at).
 */
export const revokeUserApiKey = (keyId: string, userId: string) =>
  Effect.gen(function* () {
    const svc = yield* ApiKeys
    return yield* svc.revokeUserApiKey(keyId, userId)
  }).pipe(Effect.provide(ApiKeys.Default))

/**
 * Verify a plaintext API key against stored hash.
 * Returns true if valid, false otherwise.
 */
export function verifyApiKey(token: string, storedHash: string): boolean {
  return hashToken(token) === storedHash
}
