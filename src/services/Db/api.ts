/**
 * Database service API.
 * Uses Drizzle ORM for type-safe queries, wrapped in Effect for typed error handling.
 */

import { Effect } from "effect"
import { eq, desc, and, isNull, sql } from "drizzle-orm"
import { db } from "@/db/client"
import {
  users,
  waitlistSignups,
  consultingInquiries,
  apiKeys,
  analyticsEvents,
} from "@/db/schema"
import type { WaitlistSource, AnalyticsEventType } from "@/types/strings"
import { DbError } from "./errors"
import type { WaitlistSignup, ConsultingInquiry, DbUser, DbApiKey } from "./types"
import { toDbError } from "./helpers"

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export function insertWaitlistSignup(
  email: string,
  source: WaitlistSource,
  roleOrCompany?: string
): Effect.Effect<WaitlistSignup, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(waitlistSignups)
        .values({
          email,
          source,
          roleOrCompany: roleOrCompany ?? null,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      // Map Drizzle row to our type - Drizzle returns camelCase, we need snake_case
      return {
        id: row.id,
        email: row.email,
        role_or_company: row.roleOrCompany,
        source: row.source as WaitlistSource,
        created_at: row.createdAt.toISOString(),
      } satisfies WaitlistSignup
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Consulting inquiries
// ---------------------------------------------------------------------------

export function insertConsultingInquiry(data: {
  name: string
  email: string
  role?: string
  company?: string
  description: string
}): Effect.Effect<ConsultingInquiry, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(consultingInquiries)
        .values({
          name: data.name,
          email: data.email,
          role: data.role ?? null,
          company: data.company ?? null,
          description: data.description,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      // Map Drizzle row to our type
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        company: row.company,
        description: row.description,
        created_at: row.createdAt.toISOString(),
      } satisfies ConsultingInquiry
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function upsertUser(data: {
  workosId: string
  email: string
  name?: string
  avatarUrl?: string
}): Effect.Effect<DbUser, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(users)
        .values({
          workosId: data.workosId,
          email: data.email,
          name: data.name ?? null,
          avatarUrl: data.avatarUrl ?? null,
        })
        .onConflictDoUpdate({
          target: users.workosId,
          set: {
            email: sql`excluded.email`,
            name: sql`excluded.name`,
            avatarUrl: sql`excluded.avatar_url`,
            updatedAt: sql`now()`,
          },
        })
        .returning()
      if (!row) throw new Error("Upsert returned no row")
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function getUserByWorkosId(workosId: string): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.workosId, workosId))
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function updateUserPreferences(
  userId: string,
  preferences: Record<string, unknown>
): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .update(users)
        .set({
          preferences,
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId))
        .returning()
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

export function updateUserProfile(
  userId: string,
  data: { name?: string; email?: string }
): Effect.Effect<DbUser | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .update(users)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          updatedAt: sql`now()`,
        })
        .where(eq(users.id, userId))
        .returning()
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        workos_id: row.workosId,
        email: row.email,
        name: row.name,
        avatar_url: row.avatarUrl,
        preferences: row.preferences as Record<string, unknown>,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } satisfies DbUser
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export function insertApiKey(data: {
  userId: string
  name: string
  keyPrefix: string
  keyHash: string
}): Effect.Effect<DbApiKey, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const [row] = await db
        .insert(apiKeys)
        .values({
          userId: data.userId,
          name: data.name,
          keyPrefix: data.keyPrefix,
          keyHash: data.keyHash,
        })
        .returning()
      if (!row) throw new Error("Insert returned no row")
      // Map Drizzle row to our type
      return {
        id: row.id,
        user_id: row.userId,
        name: row.name,
        key_prefix: row.keyPrefix,
        key_hash: row.keyHash,
        created_at: row.createdAt.toISOString(),
        revoked_at: row.revokedAt?.toISOString() ?? null,
      } satisfies DbApiKey
    },
    catch: toDbError,
  })
}

export function listApiKeys(userId: string): Effect.Effect<readonly DbApiKey[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId))
        .orderBy(desc(apiKeys.createdAt))
      // Map Drizzle rows to our type
      return rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        name: row.name,
        key_prefix: row.keyPrefix,
        key_hash: row.keyHash,
        created_at: row.createdAt.toISOString(),
        revoked_at: row.revokedAt?.toISOString() ?? null,
      })) satisfies readonly DbApiKey[]
    },
    catch: toDbError,
  })
}

export function revokeApiKey(keyId: string, userId: string): Effect.Effect<DbApiKey | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db
        .update(apiKeys)
        .set({ revokedAt: sql`now()` })
        .where(
          and(
            eq(apiKeys.id, keyId),
            eq(apiKeys.userId, userId),
            isNull(apiKeys.revokedAt)
          )
        )
        .returning()
      const row = rows[0]
      if (!row) return null
      // Map Drizzle row to our type
      return {
        id: row.id,
        user_id: row.userId,
        name: row.name,
        key_prefix: row.keyPrefix,
        key_hash: row.keyHash,
        created_at: row.createdAt.toISOString(),
        revoked_at: row.revokedAt?.toISOString() ?? null,
      } satisfies DbApiKey
    },
    catch: toDbError,
  })
}

// ---------------------------------------------------------------------------
// Analytics events
// ---------------------------------------------------------------------------

export function insertAnalyticsEvent(
  eventType: AnalyticsEventType,
  payload: Record<string, unknown> = {}
): Effect.Effect<void, DbError> {
  return Effect.tryPromise({
    try: async () => {
      await db.insert(analyticsEvents).values({ eventType, payload })
    },
    catch: toDbError,
  })
}
