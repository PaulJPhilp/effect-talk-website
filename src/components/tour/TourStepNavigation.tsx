"use client"

import { useMemo } from "react"
import Link from "next/link"
import { buildTourHref, type TourMode } from "@/lib/tourMode"
import type { TourStep } from "@/services/TourProgress/types"

interface TourStepNavigationProps {
  readonly currentStepIndex: number
  readonly steps: readonly TourStep[]
  readonly lessonSlug: string
  readonly currentStepId: string
  readonly completedStepIds: ReadonlySet<string>
  readonly onMarkCurrentStepComplete: (stepId: string) => void
  readonly mode: TourMode
}

export function TourStepNavigation({
  currentStepIndex,
  steps,
  lessonSlug,
  currentStepId,
  completedStepIds,
  onMarkCurrentStepComplete,
  mode,
}: TourStepNavigationProps) {
  const hasPrevious = currentStepIndex > 0
  const hasNext = currentStepIndex < steps.length - 1

  const previousStep = hasPrevious ? steps[currentStepIndex - 1] : null
  const nextStep = hasNext ? steps[currentStepIndex + 1] : null

  const stepLinks = useMemo(() => {
    return steps.map((step, index) => {
      const isCurrent = index === currentStepIndex
      const isCompleted = completedStepIds.has(step.id)
      return {
        step,
        className: [
          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition-colors",
          isCurrent
            ? "border-foreground bg-foreground text-background"
            : isCompleted
              ? "border-foreground/70 text-foreground"
              : "border-muted-foreground/30 text-muted-foreground/50 hover:border-muted-foreground/60",
        ].join(" "),
        isCompleted,
      }
    })
  }, [steps, currentStepIndex, completedStepIds])

  return (
    <nav className="flex items-center justify-center gap-3 text-sm">
      {hasPrevious && previousStep ? (
        <Link
          href={buildTourHref(`/tour/${lessonSlug}`, undefined, { mode, step: previousStep.order_index })}
          className="font-medium hover:underline"
        >
          Back
        </Link>
      ) : (
        <Link
          href={buildTourHref("/tour", undefined, { mode, step: null })}
          className="font-medium hover:underline"
        >
          Back
        </Link>
      )}
      <span className="text-muted-foreground">—</span>
      <Link
        href={buildTourHref("/tour", undefined, { mode, step: null })}
        className="font-medium hover:underline"
      >
        Lessons
      </Link>
      <div className="mx-1 flex items-center gap-1.5">
        {stepLinks.map(({ step, className, isCompleted }) => {
          return (
            <Link
              key={step.id}
              href={buildTourHref(`/tour/${lessonSlug}`, undefined, { mode, step: step.order_index })}
              className={className}
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
          href={buildTourHref(`/tour/${lessonSlug}`, undefined, { mode, step: nextStep.order_index })}
          className="font-medium hover:underline"
          onClick={() => {
            onMarkCurrentStepComplete(currentStepId)
          }}
        >
          Next
        </Link>
      ) : (
        <Link
          href={buildTourHref("/tour", undefined, { mode, step: null })}
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
