/**
 * Email service errors.
 */

import { Data } from "effect"

export class EmailError extends Data.TaggedError("EmailError")<{
  readonly message: string
}> {}
