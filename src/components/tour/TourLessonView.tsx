"use client"

import { useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TourStep } from "@/components/tour/TourStep"
import { useTourProgress } from "@/hooks/useTourProgress"
import { getLastStepForLesson, setLastStepForLesson } from "@/lib/tourPosition"
import { trackEventClient } from "@/lib/analytics-client"
import type { TourLessonWithSteps } from "@/services/TourProgress/types"

interface TourLessonViewProps {
  readonly lesson: TourLessonWithSteps
  readonly isLoggedIn: boolean
}

export function TourLessonView({ lesson, isLoggedIn }: TourLessonViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get("step")

  const currentStepIndex = useMemo(() => {
    if (stepParam) {
      const stepNum = Number.parseInt(stepParam, 10)
      const index = lesson.steps.findIndex((s) => s.order_index === stepNum)
      return index >= 0 ? index : 0
    }
    const last = getLastStepForLesson(lesson.slug)
    if (last != null) {
      const index = lesson.steps.findIndex((s) => s.order_index === last)
      if (index >= 0) return index
    }
    return 0
  }, [lesson.slug, lesson.steps, stepParam])

  const currentStep = lesson.steps[currentStepIndex]

  // Sync URL to saved position when opening lesson without a step param
  useEffect(() => {
    if (stepParam != null) return
    if (!currentStep) return
    router.replace(`/tour/${lesson.slug}?step=${currentStep.order_index}`, { scroll: false })
  }, [lesson.slug, currentStep, stepParam, router])

  // Persist current step so returning to this lesson restores position
  useEffect(() => {
    if (currentStep) setLastStepForLesson(lesson.slug, currentStep.order_index)
  }, [lesson.slug, currentStep])

  // Track lesson started
  useEffect(() => {
    trackEventClient({ type: "lesson_started", lessonSlug: lesson.slug }).catch(() => {})
  }, [lesson.slug])

  const { completedStepIds, markStepCompleted } = useTourProgress({
    steps: lesson.steps,
    isLoggedIn,
  })

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
