/**
 * BackendApi Effect.Service implementation.
 *
 * Reads from {@link Db} and transforms internal Db types into public-facing
 * {@link Pattern} and {@link Rule} types. Db errors are mapped to
 * {@link BackendApiError}.
 *
 * @module BackendApi/service
 */

import { Effect, Layer } from "effect"
import { BackendApiError } from "@/services/BackendApi/errors"
import type { Pattern, Rule } from "@/services/BackendApi/types"
import {
  getAllPatterns,
  getPatternById,
  getAllRules,
  getRuleById,
  searchPatternsAndRules,
} from "@/services/Db/api"
import type { DbError } from "@/services/Db/errors"
import type { DbPattern, DbRule } from "@/services/Db/types"
import type { BackendApiService } from "@/services/BackendApi/api"

function formatDbErrorMessage(e: DbError): string {
  const base = e.message
  const causeMsg =
    e.cause instanceof Error ? e.cause.message : typeof e.cause === "string" ? e.cause : null
  if (causeMsg && causeMsg !== base) {
    return `${base} → ${causeMsg}`
  }
  return base
}

function toPattern(db: DbPattern): Pattern {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    content: db.content,
    category: db.category ?? undefined,
    difficulty: db.difficulty ?? undefined,
    tags: db.tags ?? undefined,
    new: db.new,
  }
}

function toRule(db: DbRule): Rule {
  return {
    id: db.id,
    title: db.title,
    description: db.description,
    content: db.content,
    category: db.category ?? undefined,
    severity: db.severity ?? undefined,
    tags: db.tags ?? undefined,
  }
}

export class BackendApi extends Effect.Service<BackendApiService>()("BackendApi", {
  effect: Effect.gen(function* () {
    return {
      fetchPatterns: () =>
        getAllPatterns().pipe(
          Effect.map((rows) => rows.map(toPattern)),
          Effect.mapError((e) => new BackendApiError({ message: formatDbErrorMessage(e) })),
        ),

      fetchPattern: (id: string) =>
        getPatternById(id).pipe(
          Effect.map((row) => (row ? toPattern(row) : null)),
          Effect.mapError((e) => new BackendApiError({ message: formatDbErrorMessage(e) })),
        ),

      fetchRules: () =>
        getAllRules().pipe(
          Effect.map((rows) => rows.map(toRule)),
          Effect.mapError((e) => new BackendApiError({ message: e.message })),
        ),

      fetchRule: (id: string) =>
        getRuleById(id).pipe(
          Effect.map((row) => (row ? toRule(row) : null)),
          Effect.mapError((e) => new BackendApiError({ message: e.message })),
        ),

      searchBackend: (q: string) =>
        searchPatternsAndRules(q).pipe(
          Effect.map((result) => ({
            patterns: result.patterns.map(toPattern),
            rules: result.rules.map(toRule),
          })),
          Effect.mapError((e) => new BackendApiError({ message: e.message })),
        ),

      fetchPatternIds: () =>
        getAllPatterns().pipe(
          Effect.map((rows) => rows.map((p) => p.id)),
          Effect.mapError((e) => new BackendApiError({ message: formatDbErrorMessage(e) })),
        ),

      fetchRuleIds: () =>
        getAllRules().pipe(
          Effect.map((rows) => rows.map((r) => r.id)),
          Effect.mapError((e) => new BackendApiError({ message: e.message })),
        ),
    } satisfies BackendApiService
  }),
}) {}

/** No-op implementation for tests. */
export const BackendApiNoOp = Layer.succeed(BackendApi, {
  fetchPatterns: () => Effect.succeed([]),
  fetchPattern: () => Effect.succeed(null),
  fetchRules: () => Effect.succeed([]),
  fetchRule: () => Effect.succeed(null),
  searchBackend: () => Effect.succeed({ patterns: [], rules: [] }),
  fetchPatternIds: () => Effect.succeed([]),
  fetchRuleIds: () => Effect.succeed([]),
})
