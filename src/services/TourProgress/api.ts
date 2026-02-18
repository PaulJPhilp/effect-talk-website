/**
 * Tour Progress service API.
 * Uses Drizzle ORM for type-safe queries, wrapped in Effect for typed error handling.
 */

import { Effect } from "effect"
import { eq, and, asc, sql } from "drizzle-orm"
import { db } from "@/db/client"
import { tourLessons, tourSteps, tourProgress, patterns, NEW_PATTERN_RELEASE_CUTOFF } from "@/db/schema"
import { logTourServerMetric } from "@/lib/tour-perf"
import type { DbError } from "@/services/Db/errors"
import { toDbError } from "@/services/Db/helpers"
import type {
  TourLesson,
  TourStep,
  TourProgress as TourProgressType,
  TourProgressStatus,
  TourLessonWithSteps,
  TourStepWithProgress,
  TourLessonListItem,
} from "@/services/TourProgress/types"

// ---------------------------------------------------------------------------
// Tour Lessons
// ---------------------------------------------------------------------------

function mapLesson(row: typeof tourLessons.$inferSelect): TourLesson {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    order_index: row.orderIndex,
    group: row.group ?? null,
    difficulty: row.difficulty,
    estimated_minutes: row.estimatedMinutes,
    created_at: row.createdAt.toISOString(),
  }
}

export function getAllLessons(): Effect.Effect<readonly TourLesson[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourLessons).orderBy(asc(tourLessons.orderIndex))
      return rows.map(mapLesson)
    },
    catch: toDbError,
  })
}

export function getAllLessonsForList(): Effect.Effect<readonly TourLessonListItem[], DbError> {
  return Effect.tryPromise({
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
  })
}

export function getLessonBySlug(slug: string): Effect.Effect<TourLesson | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourLessons).where(eq(tourLessons.slug, slug))
      const row = rows[0]
      if (!row) return null
      return mapLesson(row)
    },
    catch: toDbError,
  })
}

export function getLessonWithSteps(slug: string): Effect.Effect<TourLessonWithSteps | null, DbError> {
  return Effect.tryPromise({
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
  })
}

// ---------------------------------------------------------------------------
// Tour Steps
// ---------------------------------------------------------------------------

function mapStep(row: typeof tourSteps.$inferSelect): TourStep {
  return {
    id: row.id,
    lesson_id: row.lessonId,
    order_index: row.orderIndex,
    title: row.title,
    instruction: row.instruction,
    concept_code: row.conceptCode,
    concept_code_language: row.conceptCodeLanguage,
    solution_code: row.solutionCode,
    playground_url: row.playgroundUrl,
    hints: row.hints as readonly string[] | null,
    feedback_on_complete: row.feedbackOnComplete,
    pattern_id: row.patternId,
    created_at: row.createdAt.toISOString(),
  }
}

type StepRowWithPatternRelease = typeof tourSteps.$inferSelect & {
  patternReleaseVersion?: string | null
}

function mapStepWithPatternNew(row: StepRowWithPatternRelease): TourStep {
  const isNewFromRelease =
    row.patternReleaseVersion != null &&
    row.patternReleaseVersion >= NEW_PATTERN_RELEASE_CUTOFF
  return {
    ...mapStep(row),
    pattern_new: isNewFromRelease ? true : undefined,
  }
}

export function getStepById(stepId: string): Effect.Effect<TourStep | null, DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourSteps).where(eq(tourSteps.id, stepId))
      const row = rows[0]
      if (!row) return null
      return mapStep(row)
    },
    catch: toDbError,
  })
}

export function getStepWithProgress(
  stepId: string,
  userId: string
): Effect.Effect<TourStepWithProgress | null, DbError> {
  return Effect.tryPromise({
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
  })
}

// ---------------------------------------------------------------------------
// Tour Progress
// ---------------------------------------------------------------------------

function mapProgress(row: typeof tourProgress.$inferSelect): TourProgressType {
  return {
    id: row.id,
    user_id: row.userId,
    step_id: row.stepId,
    status: row.status as TourProgressStatus,
    feedback: row.feedback,
    completed_at: row.completedAt?.toISOString() || null,
    created_at: row.createdAt.toISOString(),
  }
}

export function getUserProgress(userId: string): Effect.Effect<readonly TourProgressType[], DbError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await db.select().from(tourProgress).where(eq(tourProgress.userId, userId))
      return rows.map(mapProgress)
    },
    catch: toDbError,
  })
}

export function getStepProgress(
  stepId: string,
  userId: string
): Effect.Effect<TourProgressType | null, DbError> {
  return Effect.tryPromise({
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
  })
}

export function upsertStepProgress(
  userId: string,
  stepId: string,
  status: TourProgressStatus,
  feedback?: string
): Effect.Effect<TourProgressType, DbError> {
  return Effect.tryPromise({
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
  })
}

export function bulkUpsertProgress(
  userId: string,
  progress: ReadonlyArray<{ stepId: string; status: TourProgressStatus }>
): Effect.Effect<readonly TourProgressType[], DbError> {
  return Effect.tryPromise({
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
  })
}
