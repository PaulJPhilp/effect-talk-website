/**
 * Analytics service types.
 */

import type {
  AnalyticsEventType,
  TabType,
  WaitlistSource,
} from "@/types/strings";

export interface WaitlistSubmittedEvent {
  readonly source: WaitlistSource;
  readonly type: Extract<AnalyticsEventType, "waitlist_submitted">;
}

export interface ConsultingSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "consulting_submitted">;
}

export interface FeedbackSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "feedback_submitted">;
}

export interface TabClickedEvent {
  readonly tab: TabType;
  readonly type: Extract<AnalyticsEventType, "tab_clicked">;
}

export interface SearchPerformedEvent {
  readonly pageCount: number;
  readonly patternCount: number;
  readonly queryLength: number;
  readonly ruleCount: number;
  readonly type: Extract<AnalyticsEventType, "search_performed">;
}

export interface TourStartedEvent {
  readonly type: Extract<AnalyticsEventType, "tour_started">;
}

export interface LessonStartedEvent {
  readonly lessonSlug: string;
  readonly type: Extract<AnalyticsEventType, "lesson_started">;
}

export interface StepCompletedEvent {
  readonly lessonSlug: string;
  readonly stepId: string;
  readonly type: Extract<AnalyticsEventType, "step_completed">;
}

export interface LessonCompletedEvent {
  readonly lessonSlug: string;
  readonly type: Extract<AnalyticsEventType, "lesson_completed">;
}

export type AnalyticsEvent =
  | WaitlistSubmittedEvent
  | ConsultingSubmittedEvent
  | FeedbackSubmittedEvent
  | TabClickedEvent
  | SearchPerformedEvent
  | TourStartedEvent
  | LessonStartedEvent
  | StepCompletedEvent
  | LessonCompletedEvent;
