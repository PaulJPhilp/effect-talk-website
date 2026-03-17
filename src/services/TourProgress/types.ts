/**
 * Tour Progress service types.
 */

export type TourProgressStatus = "not_started" | "completed" | "skipped";

export interface TourLesson {
  readonly created_at: string;
  readonly description: string;
  readonly difficulty: string;
  readonly estimated_minutes: number | null;
  readonly group: string | null;
  readonly id: string;
  readonly order_index: number;
  readonly slug: string;
  readonly title: string;
}

export interface TourStep {
  readonly concept_code: string | null;
  readonly concept_code_language: string | null;
  readonly concept_code_v4: string | null;
  readonly created_at: string;
  readonly feedback_on_complete: string | null;
  readonly hints: readonly string[] | null;
  readonly id: string;
  readonly instruction: string;
  readonly lesson_id: string;
  readonly migration_status?: "unchanged" | "auto-certified" | "review-needed";
  readonly order_index: number;
  readonly pattern_id: string | null;
  /** True when the linked pattern is marked new (e.g. release_version >= cutoff). */
  readonly pattern_new?: boolean;
  readonly playground_url: string | null;
  readonly solution_code: string | null;
  readonly solution_code_v4: string | null;
  readonly title: string;
  readonly v3_source_path?: string | null;
  readonly v3_source_ref?: string | null;
}

export interface TourProgress {
  readonly completed_at: string | null;
  readonly created_at: string;
  readonly feedback: string | null;
  readonly id: string;
  readonly status: TourProgressStatus;
  readonly step_id: string;
  readonly user_id: string;
}

export interface TourLessonWithSteps extends TourLesson {
  readonly steps: readonly TourStep[];
}

export interface TourStepWithProgress extends TourStep {
  readonly progress: TourProgress | null;
}

export interface TourLessonListItem extends TourLesson {
  readonly step_count: number;
  readonly step_ids: readonly string[];
}
