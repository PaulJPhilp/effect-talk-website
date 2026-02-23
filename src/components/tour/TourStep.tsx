"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { TourStepNavigation } from "@/components/tour/TourStepNavigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TourStep as TourStepType } from "@/services/TourProgress/types"

const TourCodeRunner = dynamic(
  () => import("@/components/tour/TourCodeRunner").then((module) => module.TourCodeRunner),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center bg-muted/30">
        <div className="text-sm text-muted-foreground">Loading code editor...</div>
      </div>
    ),
  }
)

interface TourStepProps {
  readonly step: TourStepType
  readonly lessonSlug: string
  readonly steps: readonly TourStepType[]
  readonly currentStepIndex: number
  readonly completedStepIds: ReadonlySet<string>
  readonly onStepCompleted: (stepId: string) => void
}

export function TourStep({
  step,
  lessonSlug,
  steps,
  currentStepIndex,
  completedStepIds,
  onStepCompleted,
}: TourStepProps) {
  const hasSolution = Boolean(step.solution_code)
  const [selectedTab, setSelectedTab] = useState<"anti-pattern" | "solution">("anti-pattern")

  // Radix Tabs use useId() which causes hydration mismatch in Next.js 15.5+ / React 19.2.
  // We gate Tabs to the client without a setState-in-effect pattern.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const instructionParagraphs = useMemo(() => {
    return step.instruction
      .split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .map((paragraph) => paragraph.split("\n").join(" "))
  }, [step.instruction])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
      {/* Left: Explanation */}
      <div className="p-5 md:p-8 md:border-r">
        <h2 className="text-2xl font-bold tracking-tight mb-4">{step.title}</h2>

        <div className="text-lg leading-relaxed space-y-3">
          {instructionParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        {/* Hints */}
        {step.hints && step.hints.length > 0 && (
          <div className="mt-5">
            <ul className="text-base text-muted-foreground list-disc pl-5 space-y-1">
              {step.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Pattern */}
        {step.pattern_id && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Link
              href={`/patterns/${step.pattern_id}?from=${encodeURIComponent(lessonSlug)}&step=${step.order_index}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              View related pattern
            </Link>
            {step.pattern_new && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-success/10 border border-success/50 text-success"
                aria-label="New pattern"
              >
                New
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-5 pt-4 border-t">
          <TourStepNavigation
            currentStepIndex={currentStepIndex}
            steps={steps}
            lessonSlug={lessonSlug}
            currentStepId={step.id}
            completedStepIds={completedStepIds}
            onMarkCurrentStepComplete={onStepCompleted}
          />
        </div>
      </div>

      {/* Right: Code Runner */}
      <div
        className="flex flex-col items-stretch bg-muted/30 px-1 py-1 md:px-2 md:py-2"
        style={{ minHeight: "600px" }}
      >
        {step.concept_code && (
          <div className="w-full flex-1 flex flex-col min-h-[500px]" style={{ minHeight: "600px" }}>
            {hasSolution ? (
              mounted ? (
                <Tabs
                  value={selectedTab}
                  onValueChange={(value) => {
                    if (value === "anti-pattern" || value === "solution") {
                      setSelectedTab(value)
                    }
                  }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  <TabsList variant="line" className="h-9 shrink-0 w-full justify-start gap-0 rounded-none border-b bg-transparent p-0">
                    <TabsTrigger value="anti-pattern" className="text-sm px-3 py-2 after:hidden data-[state=active]:font-semibold">
                      Anti-pattern
                    </TabsTrigger>
                    <TabsTrigger value="solution" className="text-sm px-3 py-2 after:hidden data-[state=active]:font-semibold">
                      Solution
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="anti-pattern" className="flex-1 min-h-0 mt-0">
                    <div className="h-full min-h-[500px]">
                      {selectedTab === "anti-pattern" ? (
                        <TourCodeRunner code={step.concept_code} readOnly={true} />
                      ) : null}
                    </div>
                  </TabsContent>
                  <TabsContent value="solution" className="flex-1 min-h-0 mt-0">
                    <div className="h-full min-h-[500px] flex flex-col">
                      {step.solution_code && selectedTab === "solution" && (
                        <TourCodeRunner code={step.solution_code} readOnly={true} />
                      )}
                      {step.feedback_on_complete && (
                        <div className="px-3 py-2 border-t bg-muted/30">
                          <p className="text-sm text-muted-foreground italic">
                            {step.feedback_on_complete}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="h-8 shrink-0 w-full border-b bg-transparent" />
                  <div className="flex-1 min-h-0 mt-0">
                    <div className="h-full min-h-[500px]">
                      <TourCodeRunner code={step.concept_code} readOnly={true} />
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full flex-1" style={{ minHeight: "500px", height: "100%" }}>
                <TourCodeRunner code={step.concept_code} readOnly={true} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
