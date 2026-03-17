/**
 * Customer configuration service helpers.
 */

import type { CustomerConfig } from "@/services/CustomerConfig/types"
import { CustomerConfigError } from "@/services/CustomerConfig/errors"

export function normalizeCustomerConfig(config: Record<string, unknown> | null | undefined): CustomerConfig {
  return config ?? {}
}

export function customerNotFoundError(userId: string): CustomerConfigError {
  return new CustomerConfigError({
    message: `Customer configuration not found for user ${userId}`,
  })
}
