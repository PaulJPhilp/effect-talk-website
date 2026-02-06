/**
 * API Keys service errors.
 */

import { Data } from "effect"

export class ApiKeyError extends Data.TaggedError("ApiKeyError")<{
  readonly message: string
}> {}
