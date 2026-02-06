/**
 * Shared helpers for Effect Schema validation in route handlers.
 */

import { ParseResult } from "effect"

interface FormattedIssue {
  readonly message: string
  readonly path: readonly PropertyKey[]
}

/**
 * Format an Effect Schema ParseError into a serializable array of error objects.
 * Uses ArrayFormatter for structured error output compatible with form libraries.
 */
export function formatSchemaErrors(
  error: ParseResult.ParseError
): readonly FormattedIssue[] {
  const formatted = ParseResult.ArrayFormatter.formatErrorSync(error)
  return formatted.map((issue) => ({
    message: issue.message,
    path: issue.path,
  }))
}
