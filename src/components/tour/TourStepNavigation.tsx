"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildTourHref, type TourMode } from "@/lib/tourMode";
import type { TourStep } from "@/services/TourProgress/types";

interface TourStepNavigationProps {
  readonly completedStepIds: ReadonlySet<string>;
  readonly currentStepId: string;
  readonly currentStepIndex: number;
  readonly lessonSlug: string;
  readonly mode: TourMode;
  readonly onMarkCurrentStepComplete: (stepId: string) => void;
  readonly steps: readonly TourStep[];
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
  const hasPrevious = currentStepIndex > 0;
  const hasNext = currentStepIndex < steps.length - 1;

  const previousStep = hasPrevious ? steps[currentStepIndex - 1] : null;
  const nextStep = hasNext ? steps[currentStepIndex + 1] : null;

  const stepLinks = useMemo(() => {
    return steps.map((step, index) => {
      const isCurrent = index === currentStepIndex;
      const isCompleted = completedStepIds.has(step.id);
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
      };
    });
  }, [steps, currentStepIndex, completedStepIds]);

  return (
    <nav className="flex items-center justify-center gap-3 text-sm">
      {hasPrevious && previousStep ? (
        <Link
          className="font-medium hover:underline"
          href={buildTourHref(`/tour/${lessonSlug}`, undefined, {
            mode,
            step: previousStep.order_index,
          })}
        >
          Back
        </Link>
      ) : (
        <Link
          className="font-medium hover:underline"
          href={buildTourHref("/tour", undefined, { mode, step: null })}
        >
          Back
        </Link>
      )}
      <span className="text-muted-foreground">—</span>
      <Link
        className="font-medium hover:underline"
        href={buildTourHref("/tour", undefined, { mode, step: null })}
      >
        Lessons
      </Link>
      <div className="mx-1 flex items-center gap-1.5">
        {stepLinks.map(({ step, className, isCompleted }) => {
          return (
            <Link
              aria-label={`Go to step ${step.order_index}: ${step.title}`}
              className={className}
              href={buildTourHref(`/tour/${lessonSlug}`, undefined, {
                mode,
                step: step.order_index,
              })}
              key={step.id}
              title={step.title}
            >
              {isCompleted ? "✓" : ""}
            </Link>
          );
        })}
      </div>
      <span className="text-muted-foreground">—</span>
      {hasNext && nextStep ? (
        <Link
          className="font-medium hover:underline"
          href={buildTourHref(`/tour/${lessonSlug}`, undefined, {
            mode,
            step: nextStep.order_index,
          })}
          onClick={() => {
            onMarkCurrentStepComplete(currentStepId);
          }}
        >
          Next
        </Link>
      ) : (
        <Link
          className="font-medium text-muted-foreground"
          href={buildTourHref("/tour", undefined, { mode, step: null })}
          onClick={() => {
            onMarkCurrentStepComplete(currentStepId);
          }}
        >
          Finish
        </Link>
      )}
    </nav>
  );
}
