"use client"

import { useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TourStep } from "@/components/tour/TourStep"
import { useTourProgress } from "@/hooks/useTourProgress"
import { trackEventClient } from "@/lib/analytics-client"
import type { TourLessonWithSteps } from "@/services/TourProgress/types"

interface TourLessonViewProps {
  readonly lesson: TourLessonWithSteps
  readonly isLoggedIn: boolean
}

export function TourLessonView({ lesson, isLoggedIn }: TourLessonViewProps) {
  const searchParams = useSearchParams()
  const stepParam = searchParams.get("step")

  const currentStepIndex = useMemo(() => {
    if (stepParam) {
      const stepNum = Number.parseInt(stepParam, 10)
      const index = lesson.steps.findIndex((s) => s.order_index === stepNum)
      return index >= 0 ? index : 0
    }
    return 0
  }, [stepParam, lesson.steps])

  // Track lesson started
  useEffect(() => {
    trackEventClient({ type: "lesson_started", lessonSlug: lesson.slug }).catch(() => {})
  }, [lesson.slug])

  const { completedStepIds, markStepCompleted } = useTourProgress({
    steps: lesson.steps,
    isLoggedIn,
  })

  const currentStep = lesson.steps[currentStepIndex]

  if (!currentStep) {
    return <div className="p-10 text-center text-muted-foreground">Step not found</div>
  }

  return (
    <TourStep
      key={currentStep.id}
      step={currentStep}
      lessonSlug={lesson.slug}
      steps={lesson.steps}
      currentStepIndex={currentStepIndex}
      completedStepIds={completedStepIds}
      onStepCompleted={markStepCompleted}
    />
  )
}
