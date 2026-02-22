/**
 * Db Effect.Service implementation.
 *
 * All methods use Drizzle ORM with the module-level `db` client. Row
 * objects are mapped from camelCase Drizzle columns to snake_case domain
 * types via helper functions in `helpers.ts`.
 *
 * @module Db/service
 */

import { Effect, Layer } from "effect"
import { eq, desc, and, isNull, sql } from "drizzle-orm"
import { db } from "@/db/client"
import {
  users,
  waitlistSignups,
  consultingInquiries,
  feedback,
  apiKeys,
  analyticsEvents,
  patterns,
  rules,
} from "@/db/schema"
import type { WaitlistSource, AnalyticsEventType } from "@/types/strings"
import { toDbError, mapPattern, mapRule, mapUser, mapApiKey } from "@/services/Db/helpers"
import type { DbService } from "@/services/Db/api"
import type {
  WaitlistSignup,
  ConsultingInquiry,
  Feedback,
} from "@/services/Db/types"

export class Db extends Effect.Service<DbService>()("Db", {
  effect: Effect.gen(function* () {
    return {
      // Waitlist
      insertWaitlistSignup: (email: string, source: WaitlistSource, roleOrCompany?: string) =>
        Effect.tryPromise({
          try: async () => {
            const [row] = await db
              .insert(waitlistSignups)
              .values({ email, source, roleOrCompany: roleOrCompany ?? null })
              .returning()
            if (!row) throw new Error("Insert returned no row")
            return {
              id: row.id,
              email: row.email,
              role_or_company: row.roleOrCompany,
              source: row.source as WaitlistSource,
              created_at: row.createdAt.toISOString(),
            } satisfies WaitlistSignup
          },
          catch: toDbError,
        }),

      // Consulting inquiries
      insertConsultingInquiry: (data: {
        name: string
        email: string
        role?: string
        company?: string
        description: string
      }) =>
        Effect.tryPromise({
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
        }),

      // Feedback
      insertFeedback: (data: { name?: string; email: string; message: string }) =>
        Effect.tryPromise({
          try: async () => {
            const [row] = await db
              .insert(feedback)
              .values({
                name: data.name ?? null,
                email: data.email,
                message: data.message,
              })
              .returning()
            if (!row) throw new Error("Insert returned no row")
            return {
              id: row.id,
              name: row.name,
              email: row.email,
              message: row.message,
              created_at: row.createdAt.toISOString(),
            } satisfies Feedback
          },
          catch: toDbError,
        }),

      // Users
      upsertUser: (data: {
        workosId: string
        email: string
        name?: string
        avatarUrl?: string
      }) =>
        Effect.tryPromise({
          try: async () => {
            const [row] = await db
              .insert(users)
              .values({
                workosId: data.workosId,
                email: data.email,
                name: data.name ?? null,
                avatarUrl: data.avatarUrl ?? null,
                preferences: {},
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
            return mapUser(row)
          },
          catch: toDbError,
        }),

      getUserByWorkosId: (workosId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(users).where(eq(users.workosId, workosId))
            const row = rows[0]
            if (!row) return null
            return mapUser(row)
          },
          catch: toDbError,
        }),

      getUserById: (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(users).where(eq(users.id, userId))
            const row = rows[0]
            if (!row) return null
            return mapUser(row)
          },
          catch: toDbError,
        }),

      updateUserPreferences: (userId: string, preferences: Record<string, unknown>) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db
              .update(users)
              .set({ preferences, updatedAt: sql`now()` })
              .where(eq(users.id, userId))
              .returning()
            const row = rows[0]
            if (!row) return null
            return mapUser(row)
          },
          catch: toDbError,
        }),

      updateUserProfile: (userId: string, data: { name?: string; email?: string }) =>
        Effect.tryPromise({
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
            return mapUser(row)
          },
          catch: toDbError,
        }),

      // API Keys
      insertApiKey: (data: {
        userId: string
        name: string
        keyPrefix: string
        keyHash: string
      }) =>
        Effect.tryPromise({
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
            return mapApiKey(row)
          },
          catch: toDbError,
        }),

      listApiKeys: (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db
              .select()
              .from(apiKeys)
              .where(eq(apiKeys.userId, userId))
              .orderBy(desc(apiKeys.createdAt))
            return rows.map(mapApiKey)
          },
          catch: toDbError,
        }),

      revokeApiKey: (keyId: string, userId: string) =>
        Effect.tryPromise({
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
            return mapApiKey(row)
          },
          catch: toDbError,
        }),

      // Patterns
      getAllPatterns: () =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(patterns).orderBy(patterns.title)
            return rows.map(mapPattern)
          },
          catch: toDbError,
        }),

      getPatternById: (patternId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(patterns).where(eq(patterns.id, patternId))
            const row = rows[0]
            if (!row) return null
            return mapPattern(row)
          },
          catch: toDbError,
        }),

      // Rules
      getAllRules: () =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(rules).orderBy(rules.title)
            return rows.map(mapRule)
          },
          catch: toDbError,
        }),

      getRuleById: (ruleId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(rules).where(eq(rules.id, ruleId))
            const row = rows[0]
            if (!row) return null
            return mapRule(row)
          },
          catch: toDbError,
        }),

      searchPatternsAndRules: (query: string) =>
        Effect.tryPromise({
          try: async () => {
            const q = `%${query.toLowerCase()}%`
            const patternRows = await db.select().from(patterns).where(
              sql`lower(${patterns.title}) like ${q} or lower(${patterns.summary}) like ${q}`
            )
            const ruleRows = await db.select().from(rules).where(
              sql`lower(${rules.title}) like ${q} or lower(${rules.description}) like ${q}`
            )
            return {
              patterns: patternRows.map(mapPattern),
              rules: ruleRows.map(mapRule),
            }
          },
          catch: toDbError,
        }),

      // Analytics events
      insertAnalyticsEvent: (eventType: AnalyticsEventType, payload?: Record<string, unknown>) =>
        Effect.tryPromise({
          try: async () => {
            await db.insert(analyticsEvents).values({ eventType, payload: payload ?? {} })
          },
          catch: toDbError,
        }),
    } satisfies DbService
  }),
}) {}

/** No-op implementation for tests. */
export const DbNoOp = Layer.succeed(Db, {
  insertWaitlistSignup: () => Effect.succeed({ id: "", email: "", role_or_company: null, source: "playground" as const, created_at: "" }),
  insertConsultingInquiry: () => Effect.succeed({ id: "", name: "", email: "", role: null, company: null, description: "", created_at: "" }),
  insertFeedback: () => Effect.succeed({ id: "", name: null, email: "", message: "", created_at: "" }),
  upsertUser: () => Effect.succeed({ id: "", workos_id: "", email: "", name: null, avatar_url: null, preferences: {}, created_at: "", updated_at: "" }),
  getUserByWorkosId: () => Effect.succeed(null),
  getUserById: () => Effect.succeed(null),
  updateUserPreferences: () => Effect.succeed(null),
  updateUserProfile: () => Effect.succeed(null),
  insertApiKey: () => Effect.succeed({ id: "", user_id: "", name: "", key_prefix: "", key_hash: "", created_at: "", revoked_at: null }),
  listApiKeys: () => Effect.succeed([]),
  revokeApiKey: () => Effect.succeed(null),
  getAllPatterns: () => Effect.succeed([]),
  getPatternById: () => Effect.succeed(null),
  getAllRules: () => Effect.succeed([]),
  getRuleById: () => Effect.succeed(null),
  searchPatternsAndRules: () => Effect.succeed({ patterns: [], rules: [] }),
  insertAnalyticsEvent: () => Effect.void,
})
