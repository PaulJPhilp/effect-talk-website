/**
 * Database service helpers.
 */

import { DbError } from "@/services/Db/errors"
import type { patterns, rules, users, apiKeys } from "@/db/schema"
import { NEW_PATTERN_RELEASE_CUTOFF } from "@/db/schema"
import type { DbPattern, DbRule, DbUser, DbApiKey } from "@/services/Db/types"

export function toDbError(error: unknown): DbError {
  return new DbError({
    message: error instanceof Error ? error.message : "Database query failed",
    cause: error,
  })
}

export function parseTagsJsonb(tags: unknown): readonly string[] | null {
  if (tags == null) return null
  if (Array.isArray(tags)) {
    const arr = tags.filter((x): x is string => typeof x === "string")
    return arr.length > 0 ? arr : null
  }
  return null
}

export function mapPattern(row: typeof patterns.$inferSelect): DbPattern {
  const isNewFromRelease =
    row.releaseVersion != null && row.releaseVersion >= NEW_PATTERN_RELEASE_CUTOFF
  return {
    id: row.id,
    title: row.title,
    description: row.summary,
    content: row.content ?? "",
    category: row.category,
    difficulty: row.difficulty,
    tags: parseTagsJsonb(row.tags),
    new: isNewFromRelease,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function mapRule(row: typeof rules.$inferSelect): DbRule {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    category: row.category,
    severity: row.severity,
    tags: row.tags as readonly string[] | null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function mapUser(row: typeof users.$inferSelect): DbUser {
  return {
    id: row.id,
    workos_id: row.workosId,
    email: row.email,
    name: row.name,
    avatar_url: row.avatarUrl,
    preferences: row.preferences as Record<string, unknown>,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

export function mapApiKey(row: typeof apiKeys.$inferSelect): DbApiKey {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    key_prefix: row.keyPrefix,
    key_hash: row.keyHash,
    created_at: row.createdAt.toISOString(),
    revoked_at: row.revokedAt?.toISOString() ?? null,
  }
}
