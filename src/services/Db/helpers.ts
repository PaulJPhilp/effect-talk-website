/**
 * Database service helpers.
 */

import { DbError } from "./errors"

export function toDbError(error: unknown): DbError {
  return new DbError({
    message: error instanceof Error ? error.message : "Database query failed",
    cause: error,
  })
}
