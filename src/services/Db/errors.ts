/**
 * Database service errors.
 */

import { Data } from "effect"

export class DbError extends Data.TaggedError("DbError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
