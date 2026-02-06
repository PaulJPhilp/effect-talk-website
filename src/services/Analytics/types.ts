/**
 * Analytics service types.
 */

import type { WaitlistSource, TabType, AnalyticsEventType } from "@/types/strings"

export interface WaitlistSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "waitlist_submitted">
  readonly source: WaitlistSource
}

export interface ConsultingSubmittedEvent {
  readonly type: Extract<AnalyticsEventType, "consulting_submitted">
}

export interface TabClickedEvent {
  readonly type: Extract<AnalyticsEventType, "tab_clicked">
  readonly tab: TabType
}

export interface SearchPerformedEvent {
  readonly type: Extract<AnalyticsEventType, "search_performed">
  readonly queryLength: number
  readonly patternCount: number
  readonly ruleCount: number
  readonly pageCount: number
}

export type AnalyticsEvent =
  | WaitlistSubmittedEvent
  | ConsultingSubmittedEvent
  | TabClickedEvent
  | SearchPerformedEvent
