/**
 * CustomerConfig Effect.Service implementation.
 *
 * Stores user-scoped configuration in `users.preferences`.
 */

import { Effect, Layer } from "effect"
import { getUserById, updateUserPreferences } from "@/services/Db/api"
import { CustomerConfigError } from "@/services/CustomerConfig/errors"
import { customerNotFoundError, normalizeCustomerConfig } from "@/services/CustomerConfig/helpers"
import type { CustomerConfigService } from "@/services/CustomerConfig/api"

export class CustomerConfig extends Effect.Service<CustomerConfigService>()("CustomerConfig", {
  effect: Effect.gen(function* () {
    const loadConfig = (userId: string) =>
      Effect.gen(function* () {
        const user = yield* getUserById(userId).pipe(
          Effect.mapError((error) => new CustomerConfigError({ message: error.message }))
        )

        if (!user) {
          return yield* Effect.fail(customerNotFoundError(userId))
        }

        return normalizeCustomerConfig(user.preferences)
      })

    const persistConfig = (userId: string, config: Record<string, unknown>) =>
      Effect.gen(function* () {
        yield* loadConfig(userId)

        const updated = yield* updateUserPreferences(userId, config).pipe(
          Effect.mapError((error) => new CustomerConfigError({ message: error.message }))
        )

        if (!updated) {
          return yield* Effect.fail(customerNotFoundError(userId))
        }

        return normalizeCustomerConfig(updated.preferences)
      })

    return {
      getCustomerConfig: (userId: string) => loadConfig(userId),

      replaceCustomerConfig: (userId: string, config: Record<string, unknown>) => persistConfig(userId, config),

      getCustomerConfigValue: (userId: string, key: string) =>
        Effect.gen(function* () {
          const config = yield* loadConfig(userId)
          return key in config ? config[key] : null
        }),

      setCustomerConfigValue: (userId: string, key: string, value: unknown) =>
        Effect.gen(function* () {
          const config = yield* loadConfig(userId)
          return yield* persistConfig(userId, {
            ...config,
            [key]: value,
          })
        }),

      deleteCustomerConfigValue: (userId: string, key: string) =>
        Effect.gen(function* () {
          const config = yield* loadConfig(userId)
          if (!(key in config)) {
            return config
          }

          const nextConfig = { ...config }
          delete nextConfig[key]

          return yield* persistConfig(userId, nextConfig)
        }),
    } satisfies CustomerConfigService
  }),
}) {}

export const CustomerConfigNoOp = Layer.succeed(CustomerConfig, {
  getCustomerConfig: () => Effect.succeed({}),
  replaceCustomerConfig: (_userId: string, config: Record<string, unknown>) => Effect.succeed(config),
  getCustomerConfigValue: () => Effect.succeed(null),
  setCustomerConfigValue: (_userId: string, key: string, value: unknown) => Effect.succeed({ [key]: value }),
  deleteCustomerConfigValue: () => Effect.succeed({}),
})
