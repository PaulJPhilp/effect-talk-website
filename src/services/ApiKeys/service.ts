/**
 * ApiKeys Effect.Service implementation.
 *
 * Generates `ek_`-prefixed tokens, stores SHA-256 hashes (with server pepper),
 * and delegates CRUD to {@link Db}. Db errors are mapped to {@link ApiKeyError}.
 *
 * @module ApiKeys/service
 */

import { Effect, Layer } from "effect"
import { API_KEY_PREFIX_LENGTH } from "@/types/constants"
import { insertApiKey, listApiKeys, revokeApiKey } from "@/services/Db/api"
import type { DbApiKey } from "@/services/Db/types"
import { ApiKeyError } from "@/services/ApiKeys/errors"
import type { CreatedApiKey } from "@/services/ApiKeys/types"
import { hashToken, generateToken } from "@/services/ApiKeys/helpers"
import type { ApiKeysService } from "@/services/ApiKeys/api"

export class ApiKeys extends Effect.Service<ApiKeysService>()("ApiKeys", {
  effect: Effect.gen(function* () {
    return {
      createApiKey: (userId: string, name: string) =>
        Effect.gen(function* () {
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

          return { plaintext: token, record } as CreatedApiKey
        }),

      listUserApiKeys: (userId: string) =>
        listApiKeys(userId).pipe(
          Effect.mapError((e) => new ApiKeyError({ message: e.message }))
        ),

      revokeUserApiKey: (keyId: string, userId: string) =>
        revokeApiKey(keyId, userId).pipe(
          Effect.mapError((e) => new ApiKeyError({ message: e.message }))
        ),
    } satisfies ApiKeysService
  }),
}) {}

/** No-op implementation for tests. */
export const ApiKeysNoOp = Layer.succeed(ApiKeys, {
  createApiKey: () => Effect.succeed({ plaintext: "ek_test", record: {} as DbApiKey } as CreatedApiKey),
  listUserApiKeys: () => Effect.succeed([]),
  revokeUserApiKey: () => Effect.succeed(null),
})
