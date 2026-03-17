/**
 * Customer configuration service API.
 */

import { Effect } from "effect"
import type { CustomerConfigError } from "@/services/CustomerConfig/errors"
import type { CustomerConfig, CustomerConfigInput } from "@/services/CustomerConfig/types"
import { CustomerConfig as CustomerConfigServiceTag } from "@/services/CustomerConfig/service"

export interface CustomerConfigService {
  readonly getCustomerConfig: (userId: string) => Effect.Effect<CustomerConfig, CustomerConfigError>
  readonly replaceCustomerConfig: (userId: string, config: CustomerConfigInput) => Effect.Effect<CustomerConfig, CustomerConfigError>
  readonly getCustomerConfigValue: (userId: string, key: string) => Effect.Effect<unknown | null, CustomerConfigError>
  readonly setCustomerConfigValue: (userId: string, key: string, value: unknown) => Effect.Effect<CustomerConfig, CustomerConfigError>
  readonly deleteCustomerConfigValue: (userId: string, key: string) => Effect.Effect<CustomerConfig, CustomerConfigError>
}

export const getCustomerConfig = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* CustomerConfigServiceTag
    return yield* svc.getCustomerConfig(userId)
  }).pipe(Effect.provide(CustomerConfigServiceTag.Default))

export const replaceCustomerConfig = (userId: string, config: CustomerConfigInput) =>
  Effect.gen(function* () {
    const svc = yield* CustomerConfigServiceTag
    return yield* svc.replaceCustomerConfig(userId, config)
  }).pipe(Effect.provide(CustomerConfigServiceTag.Default))

export const getCustomerConfigValue = (userId: string, key: string) =>
  Effect.gen(function* () {
    const svc = yield* CustomerConfigServiceTag
    return yield* svc.getCustomerConfigValue(userId, key)
  }).pipe(Effect.provide(CustomerConfigServiceTag.Default))

export const setCustomerConfigValue = (userId: string, key: string, value: unknown) =>
  Effect.gen(function* () {
    const svc = yield* CustomerConfigServiceTag
    return yield* svc.setCustomerConfigValue(userId, key, value)
  }).pipe(Effect.provide(CustomerConfigServiceTag.Default))

export const deleteCustomerConfigValue = (userId: string, key: string) =>
  Effect.gen(function* () {
    const svc = yield* CustomerConfigServiceTag
    return yield* svc.deleteCustomerConfigValue(userId, key)
  }).pipe(Effect.provide(CustomerConfigServiceTag.Default))
