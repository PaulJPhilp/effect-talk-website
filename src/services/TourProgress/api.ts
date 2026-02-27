/**
 * Tour Progress service API.
 *
 * Manages the guided-tour experience: lessons, steps, and per-user progress.
 * Data lives in `tour_lessons`, `tour_steps`, and `tour_progress` tables.
 *
 * @module TourProgress/api
 */

import { Effect } from "effect"
import type { DbError } from "@/services/Db/errors"
import type {
  TourLesson,
  TourStep,
  TourProgress as TourProgressType,
  TourProgressStatus,
  TourLessonWithSteps,
  TourStepWithProgress,
  TourLessonListItem,
} from "@/services/TourProgress/types"
import { TourProgress } from "@/services/TourProgress/service"

/** Service interface for tour lessons, steps, and progress tracking. */
export interface TourProgressService {
  /** Get all lessons ordered by `order_index`. */
  readonly getAllLessons: () => Effect.Effect<readonly TourLesson[], DbError>
  /** Get all lessons with step counts for the lesson-list UI. */
  readonly getAllLessonsForList: () => Effect.Effect<readonly TourLessonListItem[], DbError>
  /** Look up a single lesson by slug. */
  readonly getLessonBySlug: (slug: string) => Effect.Effect<TourLesson | null, DbError>
  /** Get a lesson with all its steps (joined query with optional pattern data). */
  readonly getLessonWithSteps: (slug: string) => Effect.Effect<TourLessonWithSteps | null, DbError>
  /** Get a single step by ID. */
  readonly getStepById: (stepId: string) => Effect.Effect<TourStep | null, DbError>
  /** Get a step with its progress record for a specific user. */
  readonly getStepWithProgress: (stepId: string, userId: string) => Effect.Effect<TourStepWithProgress | null, DbError>
  /** Get all progress records for a user. */
  readonly getUserProgress: (userId: string) => Effect.Effect<readonly TourProgressType[], DbError>
  /** Get the progress record for a specific step and user. */
  readonly getStepProgress: (stepId: string, userId: string) => Effect.Effect<TourProgressType | null, DbError>
  /** Create or update a user's progress on a step. */
  readonly upsertStepProgress: (userId: string, stepId: string, status: TourProgressStatus, feedback?: string) => Effect.Effect<TourProgressType, DbError>
  /** Bulk-upsert progress from client sync (deduplicates by stepId). */
  readonly bulkUpsertProgress: (userId: string, progress: ReadonlyArray<{ stepId: string; status: TourProgressStatus }>) => Effect.Effect<readonly TourProgressType[], DbError>
}

// ---------------------------------------------------------------------------
// Tour Lessons
// ---------------------------------------------------------------------------

export const getAllLessons = () =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getAllLessons()
  }).pipe(Effect.provide(TourProgress.Default))

export const getAllLessonsForList = () =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getAllLessonsForList()
  }).pipe(Effect.provide(TourProgress.Default))

export const getLessonBySlug = (slug: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getLessonBySlug(slug)
  }).pipe(Effect.provide(TourProgress.Default))

export const getLessonWithSteps = (slug: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getLessonWithSteps(slug)
  }).pipe(Effect.provide(TourProgress.Default))

// ---------------------------------------------------------------------------
// Tour Steps
// ---------------------------------------------------------------------------

export const getStepById = (stepId: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getStepById(stepId)
  }).pipe(Effect.provide(TourProgress.Default))

export const getStepWithProgress = (stepId: string, userId: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getStepWithProgress(stepId, userId)
  }).pipe(Effect.provide(TourProgress.Default))

// ---------------------------------------------------------------------------
// Tour Progress
// ---------------------------------------------------------------------------

export const getUserProgress = (userId: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getUserProgress(userId)
  }).pipe(Effect.provide(TourProgress.Default))

export const getStepProgress = (stepId: string, userId: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.getStepProgress(stepId, userId)
  }).pipe(Effect.provide(TourProgress.Default))

export const upsertStepProgress = (userId: string, stepId: string, status: TourProgressStatus, feedback?: string) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.upsertStepProgress(userId, stepId, status, feedback)
  }).pipe(Effect.provide(TourProgress.Default))

export const bulkUpsertProgress = (userId: string, progress: ReadonlyArray<{ stepId: string; status: TourProgressStatus }>) =>
  Effect.gen(function* () {
    const svc = yield* TourProgress
    return yield* svc.bulkUpsertProgress(userId, progress)
  }).pipe(Effect.provide(TourProgress.Default))
