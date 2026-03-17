/**
 * Customer configuration service errors.
 */

import { Data } from "effect"

export class CustomerConfigError extends Data.TaggedError("CustomerConfigError")<{
  readonly message: string
}> {}
