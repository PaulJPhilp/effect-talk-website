/**
 * Pattern Bookmarks service API.
 * Uses Drizzle ORM for type-safe queries, wrapped in Effect for typed error handling.
 */

import { Effect } from "effect"
import { eq, and, sql } from "drizzle-orm"
import { db } from "@/db/client"
import { patternBookmarks } from "@/db/schema"
import type { DbError } from "@/services/Db/errors"
import { toDbError } from "@/services/Db/helpers"

/**
 * Get all bookmarked pattern IDs for a user.
 */
export function getUserBookmarks(userId: string): Effect.Effect<string[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select({ patternId: patternBookmarks.patternId })
        .from(patternBookmarks)
        .where(eq(patternBookmarks.userId, userId))
      return rows.map((r) => r.patternId)
    },
    catch: toDbError,
  })
}

/**
 * Add a bookmark for a pattern. Uses onConflictDoNothing to prevent duplicates.
 */
export function addBookmark(userId: string, patternId: string): Effect.Effect<void, DbError> {
  return Effect.tryPromise({
    try: async () => {
      await db
        .insert(patternBookmarks)
        .values({ userId, patternId })
        .onConflictDoNothing({
          target: [patternBookmarks.userId, patternBookmarks.patternId],
        })
    },
    catch: toDbError,
  })
}

/**
 * Remove a bookmark for a pattern.
 */
export function removeBookmark(userId: string, patternId: string): Effect.Effect<void, DbError> {
  return Effect.tryPromise({
    try: async () => {
      await db
        .delete(patternBookmarks)
        .where(
          and(
            eq(patternBookmarks.userId, userId),
            eq(patternBookmarks.patternId, patternId),
          )
        )
    },
    catch: toDbError,
  })
}

/**
 * Bulk upsert bookmarks from localStorage sync. Uses onConflictDoNothing for idempotency.
 */
export function bulkUpsertBookmarks(
  userId: string,
  patternIds: readonly string[],
): Effect.Effect<void, DbError> {
  return Effect.tryPromise({
    try: async () => {
      if (patternIds.length === 0) return

      const dedupedIds = [...new Set(patternIds)]
      const values = dedupedIds.map((patternId) => ({ userId, patternId }))

      await db
        .insert(patternBookmarks)
        .values(values)
        .onConflictDoNothing({
          target: [patternBookmarks.userId, patternBookmarks.patternId],
        })
    },
    catch: toDbError,
  })
}
