/**
 * Database service API.
 *
 * Low-level data-access layer wrapping Drizzle ORM. Covers all app-owned
 * tables: users, waitlist signups, consulting inquiries, feedback, API keys,
 * patterns, rules, and analytics events.
 *
 * Higher-level services (Auth, ApiKeys, BackendApi, etc.) delegate here
 * for persistence.
 *
 * @module Db/api
 */

import { Effect } from "effect"
import type { WaitlistSource, AnalyticsEventType } from "@/types/strings"
import type { DbError } from "@/services/Db/errors"
import type {
  WaitlistSignup,
  ConsultingInquiry,
  Feedback,
  DbUser,
  DbApiKey,
  DbPattern,
  DbRule,
} from "@/services/Db/types"
import { Db } from "@/services/Db/service"

/**
 * Service interface for all database operations.
 *
 * Methods are grouped by entity: waitlist, consulting, feedback, users,
 * API keys, patterns, rules, and analytics.
 */
export interface DbService {
  // --- Waitlist ---
  readonly insertWaitlistSignup: (email: string, source: WaitlistSource, roleOrCompany?: string) => Effect.Effect<WaitlistSignup, DbError>
  // --- Consulting ---
  readonly insertConsultingInquiry: (data: { name: string; email: string; role?: string; company?: string; description: string }) => Effect.Effect<ConsultingInquiry, DbError>
  // --- Feedback ---
  readonly insertFeedback: (data: { name?: string; email: string; message: string }) => Effect.Effect<Feedback, DbError>
  // --- Users ---
  /** Upsert a user from a WorkOS profile (insert or update on `workos_id` conflict). */
  readonly upsertUser: (data: { workosId: string; email: string; name?: string; avatarUrl?: string }) => Effect.Effect<DbUser, DbError>
  readonly getUserByWorkosId: (workosId: string) => Effect.Effect<DbUser | null, DbError>
  readonly getUserById: (userId: string) => Effect.Effect<DbUser | null, DbError>
  readonly updateUserPreferences: (userId: string, preferences: Record<string, unknown>) => Effect.Effect<DbUser | null, DbError>
  readonly updateUserProfile: (userId: string, data: { name?: string; email?: string }) => Effect.Effect<DbUser | null, DbError>
  // --- API Keys ---
  readonly insertApiKey: (data: { userId: string; name: string; keyPrefix: string; keyHash: string }) => Effect.Effect<DbApiKey, DbError>
  readonly listApiKeys: (userId: string) => Effect.Effect<readonly DbApiKey[], DbError>
  /** Soft-revoke an API key (sets `revoked_at`). Returns null if already revoked or not found. */
  readonly revokeApiKey: (keyId: string, userId: string) => Effect.Effect<DbApiKey | null, DbError>
  // --- Patterns ---
  readonly getAllPatterns: () => Effect.Effect<readonly DbPattern[], DbError>
  readonly getPatternById: (patternId: string) => Effect.Effect<DbPattern | null, DbError>
  // --- Rules ---
  readonly getAllRules: () => Effect.Effect<readonly DbRule[], DbError>
  readonly getRuleById: (ruleId: string) => Effect.Effect<DbRule | null, DbError>
  /** Case-insensitive LIKE search across patterns and rules. */
  readonly searchPatternsAndRules: (query: string) => Effect.Effect<{ readonly patterns: readonly DbPattern[]; readonly rules: readonly DbRule[] }, DbError>
  // --- Analytics ---
  readonly insertAnalyticsEvent: (eventType: AnalyticsEventType, payload?: Record<string, unknown>) => Effect.Effect<void, DbError>
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export const insertWaitlistSignup = (email: string, source: WaitlistSource, roleOrCompany?: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.insertWaitlistSignup(email, source, roleOrCompany)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// Consulting inquiries
// ---------------------------------------------------------------------------

export const insertConsultingInquiry = (data: {
  name: string
  email: string
  role?: string
  company?: string
  description: string
}) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.insertConsultingInquiry(data)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export const insertFeedback = (data: {
  name?: string
  email: string
  message: string
}) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.insertFeedback(data)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const upsertUser = (data: {
  workosId: string
  email: string
  name?: string
  avatarUrl?: string
}) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.upsertUser(data)
  }).pipe(Effect.provide(Db.Default))

export const getUserByWorkosId = (workosId: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.getUserByWorkosId(workosId)
  }).pipe(Effect.provide(Db.Default))

export const getUserById = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.getUserById(userId)
  }).pipe(Effect.provide(Db.Default))

export const updateUserPreferences = (userId: string, preferences: Record<string, unknown>) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.updateUserPreferences(userId, preferences)
  }).pipe(Effect.provide(Db.Default))

export const updateUserProfile = (userId: string, data: { name?: string; email?: string }) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.updateUserProfile(userId, data)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export const insertApiKey = (data: {
  userId: string
  name: string
  keyPrefix: string
  keyHash: string
}) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.insertApiKey(data)
  }).pipe(Effect.provide(Db.Default))

export const listApiKeys = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.listApiKeys(userId)
  }).pipe(Effect.provide(Db.Default))

export const revokeApiKey = (keyId: string, userId: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.revokeApiKey(keyId, userId)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

export const getAllPatterns = () =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.getAllPatterns()
  }).pipe(Effect.provide(Db.Default))

export const getPatternById = (patternId: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.getPatternById(patternId)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export const getAllRules = () =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.getAllRules()
  }).pipe(Effect.provide(Db.Default))

export const getRuleById = (ruleId: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.getRuleById(ruleId)
  }).pipe(Effect.provide(Db.Default))

export const searchPatternsAndRules = (query: string) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.searchPatternsAndRules(query)
  }).pipe(Effect.provide(Db.Default))

// ---------------------------------------------------------------------------
// Analytics events
// ---------------------------------------------------------------------------

export const insertAnalyticsEvent = (eventType: AnalyticsEventType, payload: Record<string, unknown> = {}) =>
  Effect.gen(function* () {
    const svc = yield* Db
    return yield* svc.insertAnalyticsEvent(eventType, payload)
  }).pipe(Effect.provide(Db.Default))
