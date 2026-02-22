/**
 * Pattern Bookmarks service API.
 *
 * Manages user bookmarks for Effect patterns. Bookmarks are stored in the
 * `pattern_bookmarks` table and synced between localStorage (guest) and
 * the database (authenticated users).
 *
 * @module Bookmarks/api
 */

import { Effect } from "effect"
import type { DbError } from "@/services/Db/errors"
import { Bookmarks } from "@/services/Bookmarks/service"

/** Service interface for pattern bookmark operations. */
export interface BookmarksService {
  /** Retrieve all bookmarked pattern IDs for a user. */
  readonly getUserBookmarks: (userId: string) => Effect.Effect<string[], DbError>
  /** Add a bookmark for a pattern (idempotent — duplicates are ignored). */
  readonly addBookmark: (userId: string, patternId: string) => Effect.Effect<void, DbError>
  /** Remove a bookmark for a pattern. */
  readonly removeBookmark: (userId: string, patternId: string) => Effect.Effect<void, DbError>
  /** Bulk-upsert bookmarks from localStorage sync (idempotent). */
  readonly bulkUpsertBookmarks: (userId: string, patternIds: readonly string[]) => Effect.Effect<void, DbError>
}

/**
 * Get all bookmarked pattern IDs for a user.
 */
export const getUserBookmarks = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* Bookmarks
    return yield* svc.getUserBookmarks(userId)
  }).pipe(Effect.provide(Bookmarks.Default))

/**
 * Add a bookmark for a pattern. Uses onConflictDoNothing to prevent duplicates.
 */
export const addBookmark = (userId: string, patternId: string) =>
  Effect.gen(function* () {
    const svc = yield* Bookmarks
    return yield* svc.addBookmark(userId, patternId)
  }).pipe(Effect.provide(Bookmarks.Default))

/**
 * Remove a bookmark for a pattern.
 */
export const removeBookmark = (userId: string, patternId: string) =>
  Effect.gen(function* () {
    const svc = yield* Bookmarks
    return yield* svc.removeBookmark(userId, patternId)
  }).pipe(Effect.provide(Bookmarks.Default))

/**
 * Bulk upsert bookmarks from localStorage sync. Uses onConflictDoNothing for idempotency.
 */
export const bulkUpsertBookmarks = (userId: string, patternIds: readonly string[]) =>
  Effect.gen(function* () {
    const svc = yield* Bookmarks
    return yield* svc.bulkUpsertBookmarks(userId, patternIds)
  }).pipe(Effect.provide(Bookmarks.Default))
