/**
 * Tour Progress service helpers — row mappers.
 */

import type { tourLessons, tourSteps, tourProgress } from "@/db/schema"
import { NEW_PATTERN_RELEASE_CUTOFF } from "@/db/schema"
import type {
  TourLesson,
  TourStep,
  TourProgress as TourProgressType,
  TourProgressStatus,
} from "@/services/TourProgress/types"

export function mapLesson(row: typeof tourLessons.$inferSelect): TourLesson {
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

export function mapStep(row: typeof tourSteps.$inferSelect): TourStep {
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

export type StepRowWithPatternRelease = typeof tourSteps.$inferSelect & {
  patternReleaseVersion?: string | null
}

export function mapStepWithPatternNew(row: StepRowWithPatternRelease): TourStep {
  const isNewFromRelease =
    row.patternReleaseVersion != null &&
    row.patternReleaseVersion >= NEW_PATTERN_RELEASE_CUTOFF
  return {
    ...mapStep(row),
    pattern_new: isNewFromRelease ? true : undefined,
  }
}

export function mapProgress(row: typeof tourProgress.$inferSelect): TourProgressType {
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
