/**
 * Tour Progress service barrel exports.
 *
 * Note: The TourProgress class from service.ts takes precedence over the
 * TourProgress interface from types.ts. Consumers needing the interface
 * should import { TourProgress as TourProgressType } from types.ts directly.
 */

export * from "@/services/TourProgress/api";
export {
  TourProgress,
  TourProgressNoOp,
} from "@/services/TourProgress/service";
export type {
  TourLesson,
  TourLessonListItem,
  TourLessonWithSteps,
  TourProgressStatus,
  TourStep,
  TourStepWithProgress,
} from "@/services/TourProgress/types";
