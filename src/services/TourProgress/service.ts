/**
 * TourProgress Effect.Service implementation.
 *
 * Queries `tour_lessons`, `tour_steps`, and `tour_progress` via Drizzle.
 * The `getLessonWithSteps` method joins with `effect_patterns` to enrich
 * steps with pattern release data, falling back gracefully if the
 * patterns table doesn't exist.
 *
 * @module TourProgress/service
 */

import { Effect, Layer } from "effect"
import { eq, and, asc, sql } from "drizzle-orm"
import { db } from "@/db/client"
import { tourLessons, tourSteps, tourProgress, patterns } from "@/db/schema"
import { logTourServerMetric } from "@/lib/tour-perf"
import { toDbError } from "@/services/Db/helpers"
import { mapLesson, mapStep, mapStepWithPatternNew, mapProgress } from "@/services/TourProgress/helpers"
import type { TourProgressService } from "@/services/TourProgress/api"
import type {
  TourProgressStatus,
  TourLessonListItem,
} from "@/services/TourProgress/types"

export class TourProgress extends Effect.Service<TourProgressService>()("TourProgress", {
  effect: Effect.gen(function* () {
    return {
      getAllLessons: () =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(tourLessons).orderBy(asc(tourLessons.orderIndex))
            return rows.map(mapLesson)
          },
          catch: toDbError,
        }),

      getAllLessonsForList: () =>
        Effect.tryPromise({
          try: async () => {
            const startMs = Date.now()
            const rows = await db
              .select({
                lessonId: tourLessons.id,
                lessonSlug: tourLessons.slug,
                lessonTitle: tourLessons.title,
                lessonDescription: tourLessons.description,
                lessonOrderIndex: tourLessons.orderIndex,
                lessonGroup: tourLessons.group,
                lessonDifficulty: tourLessons.difficulty,
                lessonEstimatedMinutes: tourLessons.estimatedMinutes,
                lessonCreatedAt: tourLessons.createdAt,
                stepId: tourSteps.id,
              })
              .from(tourLessons)
              .leftJoin(tourSteps, eq(tourSteps.lessonId, tourLessons.id))
              .orderBy(asc(tourLessons.orderIndex), asc(tourSteps.orderIndex))

            const grouped = new Map<string, TourLessonListItem>()
            for (const row of rows) {
              const existing = grouped.get(row.lessonId)
              if (existing) {
                if (row.stepId) {
                  grouped.set(row.lessonId, {
                    ...existing,
                    step_ids: [...existing.step_ids, row.stepId],
                    step_count: existing.step_count + 1,
                  })
                }
                continue
              }

              grouped.set(row.lessonId, {
                id: row.lessonId,
                slug: row.lessonSlug,
                title: row.lessonTitle,
                description: row.lessonDescription,
                order_index: row.lessonOrderIndex,
                group: row.lessonGroup ?? null,
                difficulty: row.lessonDifficulty,
                estimated_minutes: row.lessonEstimatedMinutes,
                created_at: row.lessonCreatedAt.toISOString(),
                step_ids: row.stepId ? [row.stepId] : [],
                step_count: row.stepId ? 1 : 0,
              })
            }

            const results = [...grouped.values()]
            logTourServerMetric("tour_index_list_query_ms", Date.now() - startMs)
            return results
          },
          catch: toDbError,
        }),

      getLessonBySlug: (slug: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(tourLessons).where(eq(tourLessons.slug, slug))
            const row = rows[0]
            if (!row) return null
            return mapLesson(row)
          },
          catch: toDbError,
        }),

      getLessonWithSteps: (slug: string) =>
        Effect.tryPromise({
          try: async () => {
            const startMs = Date.now()
            const selectBase = {
              lessonId: tourLessons.id,
              lessonSlug: tourLessons.slug,
              lessonTitle: tourLessons.title,
              lessonDescription: tourLessons.description,
              lessonOrderIndex: tourLessons.orderIndex,
              lessonGroup: tourLessons.group,
              lessonDifficulty: tourLessons.difficulty,
              lessonEstimatedMinutes: tourLessons.estimatedMinutes,
              lessonCreatedAt: tourLessons.createdAt,
              stepId: tourSteps.id,
              stepLessonId: tourSteps.lessonId,
              stepOrderIndex: tourSteps.orderIndex,
              stepTitle: tourSteps.title,
              stepInstruction: tourSteps.instruction,
              stepConceptCode: tourSteps.conceptCode,
              stepConceptCodeLanguage: tourSteps.conceptCodeLanguage,
              stepSolutionCode: tourSteps.solutionCode,
              stepPlaygroundUrl: tourSteps.playgroundUrl,
              stepHints: tourSteps.hints,
              stepFeedbackOnComplete: tourSteps.feedbackOnComplete,
              stepPatternId: tourSteps.patternId,
              stepCreatedAt: tourSteps.createdAt,
            } as const

            let rows: Array<{
              lessonId: string
              lessonSlug: string
              lessonTitle: string
              lessonDescription: string
              lessonOrderIndex: number
              lessonGroup: string | null
              lessonDifficulty: string
              lessonEstimatedMinutes: number | null
              lessonCreatedAt: Date
              stepId: string | null
              stepLessonId: string | null
              stepOrderIndex: number | null
              stepTitle: string | null
              stepInstruction: string | null
              stepConceptCode: string | null
              stepConceptCodeLanguage: string | null
              stepSolutionCode: string | null
              stepPlaygroundUrl: string | null
              stepHints: readonly string[] | null
              stepFeedbackOnComplete: string | null
              stepPatternId: string | null
              stepCreatedAt: Date | null
              patternReleaseVersion: string | null
            }>

            try {
              rows = await db
                .select({
                  ...selectBase,
                  patternReleaseVersion: patterns.releaseVersion,
                })
                .from(tourLessons)
                .leftJoin(tourSteps, eq(tourSteps.lessonId, tourLessons.id))
                .leftJoin(patterns, eq(tourSteps.patternId, patterns.id))
                .where(eq(tourLessons.slug, slug))
                .orderBy(asc(tourSteps.orderIndex))
            } catch (error) {
              function hasMissingPatternsTableError(value: unknown): boolean {
                if (value && typeof value === "object") {
                  const candidate = value as { message?: unknown; code?: unknown; cause?: unknown }
                  if (candidate.code === "42P01") return true
                  if (typeof candidate.message === "string" && candidate.message.includes("effect_patterns")) {
                    return true
                  }
                  if (candidate.cause) return hasMissingPatternsTableError(candidate.cause)
                }
                if (typeof value === "string" && value.includes("effect_patterns")) return true
                return false
              }

              if (!hasMissingPatternsTableError(error)) {
                throw error
              }

              rows = await db
                .select({
                  ...selectBase,
                  patternReleaseVersion: sql<string | null>`null`,
                })
                .from(tourLessons)
                .leftJoin(tourSteps, eq(tourSteps.lessonId, tourLessons.id))
                .where(eq(tourLessons.slug, slug))
                .orderBy(asc(tourSteps.orderIndex))
            }

            const first = rows[0]
            if (!first) return null

            const stepRows = rows.filter(
              (
                row
              ): row is typeof row & {
                stepId: string
                stepLessonId: string
                stepOrderIndex: number
                stepTitle: string
                stepInstruction: string
                stepCreatedAt: Date
              } =>
                row.stepId !== null &&
                row.stepLessonId !== null &&
                row.stepOrderIndex !== null &&
                row.stepTitle !== null &&
                row.stepInstruction !== null &&
                row.stepCreatedAt !== null
            )

            const lesson = {
              id: first.lessonId,
              slug: first.lessonSlug,
              title: first.lessonTitle,
              description: first.lessonDescription,
              order_index: first.lessonOrderIndex,
              group: first.lessonGroup ?? null,
              difficulty: first.lessonDifficulty,
              estimated_minutes: first.lessonEstimatedMinutes,
              created_at: first.lessonCreatedAt.toISOString(),
              steps: stepRows.map((row) =>
                mapStepWithPatternNew({
                  id: row.stepId,
                  lessonId: row.stepLessonId,
                  orderIndex: row.stepOrderIndex,
                  title: row.stepTitle,
                  instruction: row.stepInstruction,
                  conceptCode: row.stepConceptCode,
                  conceptCodeLanguage: row.stepConceptCodeLanguage,
                  solutionCode: row.stepSolutionCode,
                  playgroundUrl: row.stepPlaygroundUrl,
                  hints: row.stepHints as string[] | null,
                  feedbackOnComplete: row.stepFeedbackOnComplete,
                  patternId: row.stepPatternId,
                  createdAt: row.stepCreatedAt,
                  patternReleaseVersion: row.patternReleaseVersion,
                })
              ),
            }
            logTourServerMetric("tour_lesson_query_ms", Date.now() - startMs)
            return lesson
          },
          catch: toDbError,
        }),

      getStepById: (stepId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(tourSteps).where(eq(tourSteps.id, stepId))
            const row = rows[0]
            if (!row) return null
            return mapStep(row)
          },
          catch: toDbError,
        }),

      getStepWithProgress: (stepId: string, userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const stepRows = await db.select().from(tourSteps).where(eq(tourSteps.id, stepId))
            const stepRow = stepRows[0]
            if (!stepRow) return null

            const progressRows = await db
              .select()
              .from(tourProgress)
              .where(and(eq(tourProgress.stepId, stepId), eq(tourProgress.userId, userId)))

            const progressRow = progressRows[0] || null

            return {
              ...mapStep(stepRow),
              progress: progressRow ? mapProgress(progressRow) : null,
            }
          },
          catch: toDbError,
        }),

      getUserProgress: (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(tourProgress).where(eq(tourProgress.userId, userId))
            return rows.map(mapProgress)
          },
          catch: toDbError,
        }),

      getStepProgress: (stepId: string, userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db
              .select()
              .from(tourProgress)
              .where(and(eq(tourProgress.stepId, stepId), eq(tourProgress.userId, userId)))
            const row = rows[0]
            if (!row) return null
            return mapProgress(row)
          },
          catch: toDbError,
        }),

      upsertStepProgress: (userId: string, stepId: string, status: TourProgressStatus, feedback?: string) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date()
            const completedAt = status === "completed" ? now : null
            const [row] = await db
              .insert(tourProgress)
              .values({
                userId,
                stepId,
                status,
                feedback: feedback ?? null,
                completedAt,
              })
              .onConflictDoUpdate({
                target: [tourProgress.userId, tourProgress.stepId],
                set: {
                  status,
                  feedback: feedback ?? null,
                  completedAt,
                },
              })
              .returning()
            if (!row) throw new Error("Upsert returned no row")
            return mapProgress(row)
          },
          catch: toDbError,
        }),

      bulkUpsertProgress: (userId: string, progress: ReadonlyArray<{ stepId: string; status: TourProgressStatus }>) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date()
            const dedupedProgress = new Map<string, TourProgressStatus>()
            for (const item of progress) {
              dedupedProgress.set(item.stepId, item.status)
            }

            const values = [...dedupedProgress.entries()].map(([stepId, status]) => ({
              userId,
              stepId,
              status,
              completedAt: status === "completed" ? now : null,
            }))

            if (values.length === 0) return []

            const rows = await db
              .insert(tourProgress)
              .values(values)
              .onConflictDoUpdate({
                target: [tourProgress.userId, tourProgress.stepId],
                set: {
                  status: sql`excluded.status`,
                  completedAt: sql`excluded.completed_at`,
                },
              })
              .returning()

            return rows.map(mapProgress)
          },
          catch: toDbError,
        }),
    } satisfies TourProgressService
  }),
}) {}

/** No-op implementation for tests. */
export const TourProgressNoOp = Layer.succeed(TourProgress, {
  getAllLessons: () => Effect.succeed([]),
  getAllLessonsForList: () => Effect.succeed([]),
  getLessonBySlug: () => Effect.succeed(null),
  getLessonWithSteps: () => Effect.succeed(null),
  getStepById: () => Effect.succeed(null),
  getStepWithProgress: () => Effect.succeed(null),
  getUserProgress: () => Effect.succeed([]),
  getStepProgress: () => Effect.succeed(null),
  upsertStepProgress: () => Effect.succeed({ id: "", user_id: "", step_id: "", status: "not_started" as const, feedback: null, completed_at: null, created_at: "" }),
  bulkUpsertProgress: () => Effect.succeed([]),
})
