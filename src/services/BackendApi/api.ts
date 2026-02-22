/**
 * BackendApi service API.
 *
 * Public-facing data access for Effect patterns and rules. Transforms
 * internal {@link DbPattern}/{@link DbRule} rows into public
 * {@link Pattern}/{@link Rule} types, stripping internal fields.
 *
 * Used by Next.js pages, ISR `generateStaticParams`, and the search bar.
 *
 * @module BackendApi/api
 */

import { Effect } from "effect"
import type { BackendApiError } from "@/services/BackendApi/errors"
import type { Pattern, Rule, SearchResult } from "@/services/BackendApi/types"
import { BackendApi } from "@/services/BackendApi/service"

/** Service interface for public pattern and rule data access. */
export interface BackendApiService {
  /** Fetch all patterns (ordered by title). */
  readonly fetchPatterns: () => Effect.Effect<readonly Pattern[], BackendApiError>
  /** Fetch a single pattern by ID. */
  readonly fetchPattern: (id: string) => Effect.Effect<Pattern | null, BackendApiError>
  /** Fetch all rules (ordered by title). */
  readonly fetchRules: () => Effect.Effect<readonly Rule[], BackendApiError>
  /** Fetch a single rule by ID. */
  readonly fetchRule: (id: string) => Effect.Effect<Rule | null, BackendApiError>
  /** Full-text-ish search across patterns and rules. */
  readonly searchBackend: (q: string) => Effect.Effect<SearchResult, BackendApiError>
  /** Fetch all pattern IDs (for `generateStaticParams` in ISR). */
  readonly fetchPatternIds: () => Effect.Effect<readonly string[], BackendApiError>
  /** Fetch all rule IDs (for `generateStaticParams` in ISR). */
  readonly fetchRuleIds: () => Effect.Effect<readonly string[], BackendApiError>
}

export const fetchPatterns = () =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.fetchPatterns()
  }).pipe(Effect.provide(BackendApi.Default))

export const fetchPattern = (id: string) =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.fetchPattern(id)
  }).pipe(Effect.provide(BackendApi.Default))

export const fetchRules = () =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.fetchRules()
  }).pipe(Effect.provide(BackendApi.Default))

export const fetchRule = (id: string) =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.fetchRule(id)
  }).pipe(Effect.provide(BackendApi.Default))

export const searchBackend = (q: string) =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.searchBackend(q)
  }).pipe(Effect.provide(BackendApi.Default))

/**
 * Fetch all pattern IDs (for generateStaticParams in ISR).
 */
export const fetchPatternIds = () =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.fetchPatternIds()
  }).pipe(Effect.provide(BackendApi.Default))

/**
 * Fetch all rule IDs (for generateStaticParams in ISR).
 */
export const fetchRuleIds = () =>
  Effect.gen(function* () {
    const svc = yield* BackendApi
    return yield* svc.fetchRuleIds()
  }).pipe(Effect.provide(BackendApi.Default))
