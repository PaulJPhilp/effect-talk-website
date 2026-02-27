/**
 * Bookmarks Effect.Service implementation.
 *
 * Reads/writes the `pattern_bookmarks` table via Drizzle ORM.
 * Uses `onConflictDoNothing` for idempotent inserts.
 *
 * @module Bookmarks/service
 */

import { Effect, Layer } from "effect"
import { eq, and } from "drizzle-orm"
import { db } from "@/db/client"
import { patternBookmarks } from "@/db/schema"
import { toDbError } from "@/services/Db/helpers"
import type { BookmarksService } from "@/services/Bookmarks/api"

export class Bookmarks extends Effect.Service<BookmarksService>()("Bookmarks", {
  effect: Effect.gen(function* () {
    return {
      getUserBookmarks: (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db
              .select({ patternId: patternBookmarks.patternId })
              .from(patternBookmarks)
              .where(eq(patternBookmarks.userId, userId))
            return rows.map((r) => r.patternId)
          },
          catch: toDbError,
        }),

      addBookmark: (userId: string, patternId: string) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .insert(patternBookmarks)
              .values({ userId, patternId })
              .onConflictDoNothing({
                target: [patternBookmarks.userId, patternBookmarks.patternId],
              })
          },
          catch: toDbError,
        }),

      removeBookmark: (userId: string, patternId: string) =>
        Effect.tryPromise({
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
        }),

      bulkUpsertBookmarks: (userId: string, patternIds: readonly string[]) =>
        Effect.tryPromise({
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
        }),
    } satisfies BookmarksService
  }),
}) {}

/** No-op implementation for tests. */
export const BookmarksNoOp = Layer.succeed(Bookmarks, {
  getUserBookmarks: () => Effect.succeed([]),
  addBookmark: () => Effect.void,
  removeBookmark: () => Effect.void,
  bulkUpsertBookmarks: () => Effect.void,
})
