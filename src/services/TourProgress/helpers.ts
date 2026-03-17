/**
 * Tour Progress service helpers — row mappers.
 */

import path from "node:path";
import type { tourLessons, tourProgress, tourSteps } from "@/db/schema";
import { NEW_PATTERN_RELEASE_CUTOFF } from "@/db/schema";
import { semverGte } from "@/lib/semverCompare";
import {
  buildTourManifestStepKey,
  type IndexedTourManifestStep,
  indexTourManifest,
  loadTourManifest,
} from "@/lib/tourManifest";
import type {
  TourLesson,
  TourProgressStatus,
  TourProgress as TourProgressType,
  TourStep,
} from "@/services/TourProgress/types";

let cachedTourManifestIndex: ReadonlyMap<
  string,
  IndexedTourManifestStep
> | null = null;

function getTourManifestIndex() {
  if (!cachedTourManifestIndex) {
    const manifestPath = path.resolve(
      process.cwd(),
      "content",
      "tour",
      "tour-manifest.json"
    );
    cachedTourManifestIndex = indexTourManifest(loadTourManifest(manifestPath));
  }
  return cachedTourManifestIndex;
}

function getStepTrustMetadata(
  lessonSlug: string | undefined,
  orderIndex: number,
  row: typeof tourSteps.$inferSelect
) {
  if (!lessonSlug) {
    return {
      migration_status: undefined,
      v3_source_ref: undefined,
      v3_source_path: undefined,
    } as const;
  }

  const manifestStep = getTourManifestIndex().get(
    buildTourManifestStepKey(lessonSlug, orderIndex)
  );
  if (!manifestStep) {
    return {
      migration_status: undefined,
      v3_source_ref: undefined,
      v3_source_path: undefined,
    } as const;
  }

  const conceptIdentical =
    (row.conceptCode ?? null) ===
    (row.conceptCodeV4 ?? row.conceptCode ?? null);
  const solutionIdentical =
    (row.solutionCode ?? null) ===
    (row.solutionCodeV4 ?? row.solutionCode ?? null);
  const migrationStatus =
    manifestStep.step.expectedMigrationPolicy === "review-needed"
      ? "review-needed"
      : conceptIdentical && solutionIdentical
        ? "unchanged"
        : "auto-certified";

  return {
    migration_status: migrationStatus,
    v3_source_ref: manifestStep.step.sources.concept.docsRef,
    v3_source_path: manifestStep.step.sources.concept.filePath,
  } as const;
}

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
  };
}

export function mapStep(
  row: typeof tourSteps.$inferSelect,
  lessonSlug?: string
): TourStep {
  const trustMetadata = getStepTrustMetadata(lessonSlug, row.orderIndex, row);
  return {
    id: row.id,
    lesson_id: row.lessonId,
    order_index: row.orderIndex,
    title: row.title,
    instruction: row.instruction,
    concept_code: row.conceptCode,
    concept_code_v4: row.conceptCodeV4,
    concept_code_language: row.conceptCodeLanguage,
    solution_code: row.solutionCode,
    solution_code_v4: row.solutionCodeV4,
    playground_url: row.playgroundUrl,
    hints: row.hints as readonly string[] | null,
    feedback_on_complete: row.feedbackOnComplete,
    pattern_id: row.patternId,
    migration_status: trustMetadata.migration_status,
    v3_source_ref: trustMetadata.v3_source_ref,
    v3_source_path: trustMetadata.v3_source_path,
    created_at: row.createdAt.toISOString(),
  };
}

export type StepRowWithPatternRelease = typeof tourSteps.$inferSelect & {
  patternReleaseVersion?: string | null;
  lessonSlug?: string | null;
};

export function mapStepWithPatternNew(
  row: StepRowWithPatternRelease
): TourStep {
  const isNewFromRelease =
    row.patternReleaseVersion != null &&
    semverGte(row.patternReleaseVersion, NEW_PATTERN_RELEASE_CUTOFF);
  return {
    ...mapStep(row, row.lessonSlug ?? undefined),
    pattern_new: isNewFromRelease ? true : undefined,
  };
}

export function mapProgress(
  row: typeof tourProgress.$inferSelect
): TourProgressType {
  return {
    id: row.id,
    user_id: row.userId,
    step_id: row.stepId,
    status: row.status as TourProgressStatus,
    feedback: row.feedback,
    completed_at: row.completedAt?.toISOString() || null,
    created_at: row.createdAt.toISOString(),
  };
}
