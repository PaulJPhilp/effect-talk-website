"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { TourModeSwitcher } from "@/components/tour/TourModeSwitcher";
import { TourStep } from "@/components/tour/TourStep";
import { useTourProgress } from "@/hooks/useTourProgress";
import { trackEventClient } from "@/lib/analytics-client";
import { getTourCompareView } from "@/lib/tourCompare";
import { buildTourHref, getAccessibleTourMode } from "@/lib/tourMode";
import { getLastStepForLesson, setLastStepForLesson } from "@/lib/tourPosition";
import type { TourLessonWithSteps } from "@/services/TourProgress/types";

interface TourLessonViewProps {
  readonly isLoggedIn: boolean;
  readonly lesson: TourLessonWithSteps;
}

export function TourLessonView({ lesson, isLoggedIn }: TourLessonViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const mode = getAccessibleTourMode(searchParams.get("mode"), isLoggedIn);

  const currentStepIndex = useMemo(() => {
    if (stepParam) {
      const stepNum = Number.parseInt(stepParam, 10);
      const index = lesson.steps.findIndex((s) => s.order_index === stepNum);
      return index >= 0 ? index : 0;
    }
    const last = getLastStepForLesson(lesson.slug);
    if (last != null) {
      const index = lesson.steps.findIndex((s) => s.order_index === last);
      if (index >= 0) {
        return index;
      }
    }
    return 0;
  }, [lesson.slug, lesson.steps, stepParam]);

  const currentStep = lesson.steps[currentStepIndex];

  // Sync URL to saved position when opening lesson without a step param
  useEffect(() => {
    if (stepParam != null) {
      return;
    }
    if (!currentStep) {
      return;
    }
    router.replace(
      buildTourHref(`/tour/${lesson.slug}`, searchParams, {
        mode,
        step: currentStep.order_index,
      }),
      { scroll: false }
    );
  }, [lesson.slug, currentStep, stepParam, router, searchParams, mode]);

  // Persist current step so returning to this lesson restores position
  useEffect(() => {
    if (currentStep) {
      setLastStepForLesson(lesson.slug, currentStep.order_index);
    }
  }, [lesson.slug, currentStep]);

  // Track lesson started
  useEffect(() => {
    trackEventClient({ type: "lesson_started", lessonSlug: lesson.slug }).catch(
      () => {
        // Analytics must not block lesson rendering.
      }
    );
  }, [lesson.slug]);

  const { completedStepIds, markStepCompleted } = useTourProgress({
    steps: lesson.steps,
    isLoggedIn,
  });

  if (!currentStep) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Step not found
      </div>
    );
  }

  const compareView = getTourCompareView(currentStep);

  return (
    <div className="space-y-4">
      <div className="px-5 pt-5 md:px-8 md:pt-6">
        <TourModeSwitcher isLoggedIn={isLoggedIn} />
      </div>
      <TourStep
        compareView={compareView}
        completedStepIds={completedStepIds}
        currentStepIndex={currentStepIndex}
        key={`${currentStep.id}-${mode}`}
        lessonSlug={lesson.slug}
        mode={mode}
        onStepCompleted={markStepCompleted}
        step={currentStep}
        steps={lesson.steps}
      />
    </div>
  );
}
