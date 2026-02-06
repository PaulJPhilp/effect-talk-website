/**
 * Backend API service errors.
 */

import { Data } from "effect"

export class BackendApiError extends Data.TaggedError("BackendApiError")<{
  readonly message: string
  readonly status?: number
}> {}
