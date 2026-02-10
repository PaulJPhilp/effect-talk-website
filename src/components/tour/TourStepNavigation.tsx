"use client"

import Link from "next/link"
import type { TourStep } from "@/services/TourProgress/types"

interface TourStepNavigationProps {
  readonly currentStepIndex: number
  readonly steps: readonly TourStep[]
  readonly lessonSlug: string
  readonly currentStepId: string
  readonly completedStepIds: ReadonlySet<string>
  readonly onMarkCurrentStepComplete: (stepId: string) => void
}

export function TourStepNavigation({
  currentStepIndex,
  steps,
  lessonSlug,
  currentStepId,
  completedStepIds,
  onMarkCurrentStepComplete,
}: TourStepNavigationProps) {
  const hasPrevious = currentStepIndex > 0
  const hasNext = currentStepIndex < steps.length - 1

  const previousStep = hasPrevious ? steps[currentStepIndex - 1] : null
  const nextStep = hasNext ? steps[currentStepIndex + 1] : null

  return (
    <nav className="flex items-center justify-center gap-3 text-[0.65rem]">
      {hasPrevious && previousStep ? (
        <Link
          href={`/tour/${lessonSlug}?step=${previousStep.order_index}`}
          className="font-medium hover:underline"
        >
          Back
        </Link>
      ) : (
        <Link
          href="/tour"
          className="font-medium hover:underline"
        >
          Back
        </Link>
      )}
      <span className="text-muted-foreground">—</span>
      <Link
        href="/tour"
        className="font-medium hover:underline"
      >
        Lessons
      </Link>
      <div className="mx-1 flex items-center gap-1.5">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex
          const isCompleted = completedStepIds.has(step.id)

          return (
            <Link
              key={step.id}
              href={`/tour/${lessonSlug}?step=${step.order_index}`}
              className={[
                "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[0.55rem] transition-colors",
                isCurrent
                  ? "border-foreground bg-foreground text-background"
                  : isCompleted
                    ? "border-foreground/70 text-foreground"
                    : "border-muted-foreground/30 text-muted-foreground/50 hover:border-muted-foreground/60",
              ].join(" ")}
              aria-label={`Go to step ${step.order_index}: ${step.title}`}
              title={step.title}
            >
              {isCompleted ? "✓" : ""}
            </Link>
          )
        })}
      </div>
      <span className="text-muted-foreground">—</span>
      {hasNext && nextStep ? (
        <Link
          href={`/tour/${lessonSlug}?step=${nextStep.order_index}`}
          className="font-medium hover:underline"
          onClick={() => {
            onMarkCurrentStepComplete(currentStepId)
          }}
        >
          Next
        </Link>
      ) : (
        <Link
          href="/tour"
          className="font-medium text-muted-foreground"
          onClick={() => {
            onMarkCurrentStepComplete(currentStepId)
          }}
        >
          Finish
        </Link>
      )}
    </nav>
  )
}
