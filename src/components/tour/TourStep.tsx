"use client"

import { Fragment, useMemo, useState, useSyncExternalStore } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { BookOpen, ChevronDown } from "lucide-react"
import { EMPTY_COMPARE_CODE, getTourConceptCode, getTourSolutionCode, type TourCompareView } from "@/lib/tourCompare"
import { type TourMode } from "@/lib/tourMode"
import { TourStepNavigation } from "@/components/tour/TourStepNavigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
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
  readonly mode: TourMode
  readonly compareView: TourCompareView
}

type LessonTab = "anti-pattern" | "solution"

function renderTextWithInlineCode(text: string) {
  const normalizedText = text.replace(/\\`/g, "`")
  const parts = normalizedText.split(/(`[^`]+`)/g)
  let cursor = 0

  return parts.map((part) => {
    const partStart = cursor
    cursor += part.length

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`code-${partStart}-${part.slice(1, 12)}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.95em]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    return <Fragment key={`text-${partStart}`}>{part}</Fragment>
  })
}

export function TourStep({
  step,
  lessonSlug,
  steps,
  currentStepIndex,
  completedStepIds,
  onStepCompleted,
  mode,
  compareView,
}: TourStepProps) {
  const codeMode = mode === "compare" ? "v3" : mode
  const hasSolution = Boolean(getTourSolutionCode(step, codeMode))
  const [selectedTab, setSelectedTab] = useState<LessonTab>("anti-pattern")

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

  const isCompareMode = mode === "compare"

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-0",
        isCompareMode ? "xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]" : "md:grid-cols-2"
      )}
    >
      {/* Left: Explanation */}
      <div className="p-5 md:p-8 md:border-r">
        <h2 className="text-2xl font-bold tracking-tight mb-4">{step.title}</h2>

        <div className="text-xl leading-relaxed space-y-3">
          {instructionParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{renderTextWithInlineCode(paragraph)}</p>
          ))}
        </div>

        {/* Hints */}
        {step.hints && step.hints.length > 0 && (
          <div className="mt-5">
            <ul className="text-lg text-muted-foreground list-disc pl-5 space-y-1">
              {step.hints.map((hint) => (
                <li key={hint}>{renderTextWithInlineCode(hint)}</li>
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
            mode={mode}
          />
        </div>
      </div>

      {/* Right: Code Runner */}
      <div
        className="flex flex-col items-stretch bg-muted/30 px-1 py-1 md:px-2 md:py-2"
        style={{ minHeight: "600px" }}
      >
        <div className="w-full flex-1 flex flex-col min-h-[500px]" style={{ minHeight: "600px" }}>
          {isCompareMode ? (
            <CompareModePanel step={step} compareView={compareView} />
          ) : (
            <TabbedLessonPanel
              step={step}
              hasSolution={hasSolution}
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              mounted={mounted}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface TabbedLessonPanelProps {
  readonly step: TourStepType
  readonly hasSolution: boolean
  readonly selectedTab: LessonTab
  readonly setSelectedTab: (tab: LessonTab) => void
  readonly mounted: boolean
  readonly mode: Exclude<TourMode, "compare">
}

function TabbedLessonPanel({
  step,
  hasSolution,
  selectedTab,
  setSelectedTab,
  mounted,
  mode,
}: TabbedLessonPanelProps) {
  const conceptCode = getTourConceptCode(step, mode)
  const solutionCode = getTourSolutionCode(step, mode)
  const solutionLabel = mode === "v4" ? "Solution (v4 beta)" : "Solution"

  if (!conceptCode) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">No code snippet available for this step.</p>
      </div>
    )
  }

  if (!hasSolution || !solutionCode) {
    return (
      <div className="w-full flex-1" style={{ minHeight: "500px", height: "100%" }}>
        <TourCodeRunner
          code={conceptCode}
          readOnly={true}
          panelTitle={mode === "v4" ? "v4 beta lesson code" : "Lesson code"}
        />
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="h-8 shrink-0 w-full border-b bg-transparent" />
        <div className="flex-1 min-h-0 mt-0">
          <div className="h-full min-h-[500px]">
            <TourCodeRunner
              code={conceptCode}
              readOnly={true}
              panelTitle={mode === "v4" ? "v4 beta preview" : "Lesson code"}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
            {solutionLabel}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="anti-pattern" className="flex-1 min-h-0 mt-0">
          <div className="h-full min-h-[500px]">
            {selectedTab === "anti-pattern" ? (
              <TourCodeRunner code={conceptCode} readOnly={true} panelTitle="Anti-pattern" />
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="solution" className="flex-1 min-h-0 mt-0">
          <div className="h-full min-h-[500px] flex flex-col">
            {solutionCode && selectedTab === "solution" && (
              <TourCodeRunner
                code={solutionCode}
                readOnly={true}
                panelTitle={mode === "v4" ? "v4 beta solution" : "Solution"}
              />
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
    </div>
  )
}

interface CompareModePanelProps {
  readonly step: TourStepType
  readonly compareView: TourCompareView
}

function CompareModePanel({ step, compareView }: CompareModePanelProps) {
  const bothEmpty =
    compareView.identical &&
    compareView.v3Code === EMPTY_COMPARE_CODE

  if (bothEmpty) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No code snippets are available for comparison on this step yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-[500px] grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_18rem_minmax(0,1fr)]">
      <div className="min-h-[500px]">
        <TourCodeRunner
          code={compareView.v3Code}
          readOnly={true}
          panelTitle={compareView.selectedSnippet === "solution" ? "v3 solution" : "v3 anti-pattern"}
        />
      </div>
      <div className="flex items-stretch">
        <CompareSummaryCard step={step} compareView={compareView} />
      </div>
      <div className="min-h-[500px]">
        <TourCodeRunner
          code={compareView.v4Code}
          readOnly={true}
          panelTitle={compareView.selectedSnippet === "solution" ? "v4 solution" : "v4 anti-pattern"}
        />
      </div>
    </div>
  )
}

interface CompareSummaryCardProps {
  readonly step: TourStepType
  readonly compareView: TourCompareView
}

function CompareSummaryCard({ step, compareView }: CompareSummaryCardProps) {
  const badge =
    step.migration_status === "review-needed" ? (
      <span className="inline-flex items-center rounded-full border border-rose-300/70 bg-rose-100/80 px-2 py-0.5 text-xs font-medium text-rose-900">
        Review required
      </span>
    ) : compareView.identical ? (
      <span className="inline-flex items-center rounded-full border border-amber-300/70 bg-amber-100/80 px-2 py-0.5 text-xs font-medium text-amber-900">
        Unchanged from v3
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full border border-sky-300/70 bg-sky-100/80 px-2 py-0.5 text-xs font-medium text-sky-900">
        Auto-certified v4 migration
      </span>
    )

  if (compareView.identical) {
    return (
      <div className="h-full w-full rounded border border-border bg-background/90 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Change summary</p>
          {badge}
        </div>
        <details className="group" aria-label="Identical lesson note">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            <span>v3 and v4beta are identical for this step.</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {compareView.changeSummary}
          </p>
          {(step.v3_source_ref || step.v3_source_path) && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Source: {step.v3_source_ref ?? "pinned v3 docs"} {step.v3_source_path ? `· ${step.v3_source_path}` : ""}
            </p>
          )}
        </details>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded border border-border bg-background/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Change summary</p>
        {badge}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {compareView.changeSummary}
      </p>
      <div className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
        <p>Anti-pattern: {compareView.conceptIdentical ? "unchanged" : "changed"}</p>
        <p>Solution: {compareView.solutionIdentical ? "unchanged" : "changed"}</p>
        {(step.v3_source_ref || step.v3_source_path) && (
          <p>
            Source: {step.v3_source_ref ?? "pinned v3 docs"} {step.v3_source_path ? `· ${step.v3_source_path}` : ""}
          </p>
        )}
      </div>
    </div>
  )
}
