import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TourStep } from "@/components/tour/TourStep"
import type { TourCompareView } from "@/lib/tourCompare"
import type { TourStep as TourStepType } from "@/services/TourProgress/types"

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockCodeRunner(props: { readonly code: string; readonly panelTitle?: string }) {
      return (
        <div data-testid="code-runner">
          <span>{props.panelTitle ?? "Code"}</span>
          <pre>{props.code}</pre>
        </div>
      )
    },
}))

const step: TourStepType = {
  id: "step-1",
  lesson_id: "lesson-1",
  order_index: 1,
  title: "Create a program",
  instruction: "Use `Effect.gen` to compose work.",
  concept_code: "console.log('anti-pattern')",
  concept_code_language: "typescript",
  solution_code: "console.log('solution')",
  playground_url: null,
  hints: ["Reach for `Effect.gen` first."],
  feedback_on_complete: "Nice work.",
  pattern_id: null,
  created_at: "2026-03-07T00:00:00.000Z",
}

const compareView: TourCompareView = {
  v3Code: "console.log('v3')",
  v4Code: "console.log('v4')",
  changeSummary: "Temporary migration note.",
  identical: false,
}

const identicalCompareView: TourCompareView = {
  v3Code: "console.log('same')",
  v4Code: "console.log('same')",
  changeSummary: "No v4beta changes are staged for this step yet.",
  identical: true,
}

describe("TourStep", () => {
  it("renders anti-pattern and solution tabs in v3 mode", () => {
    render(
      <TourStep
        step={step}
        lessonSlug="pipes-and-flow"
        steps={[step]}
        currentStepIndex={0}
        completedStepIds={new Set()}
        onStepCompleted={() => {}}
        mode="v3"
        compareView={compareView}
      />
    )

    expect(screen.getByRole("tab", { name: "Anti-pattern" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Solution" })).toBeInTheDocument()
  })

  it("renders the v4 beta lesson chrome in v4 mode", () => {
    render(
      <TourStep
        step={step}
        lessonSlug="pipes-and-flow"
        steps={[step]}
        currentStepIndex={0}
        completedStepIds={new Set()}
        onStepCompleted={() => {}}
        mode="v4"
        compareView={compareView}
      />
    )

    expect(screen.getByText(/v4 beta preview UI is enabled/i)).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Solution (v4 beta)" })).toBeInTheDocument()
  })

  it("renders side-by-side comparison content in compare mode", () => {
    render(
      <TourStep
        step={step}
        lessonSlug="pipes-and-flow"
        steps={[step]}
        currentStepIndex={0}
        completedStepIds={new Set()}
        onStepCompleted={() => {}}
        mode="compare"
        compareView={compareView}
      />
    )

    expect(screen.getByText("v3 solution")).toBeInTheDocument()
    expect(screen.getByText("v4 solution")).toBeInTheDocument()
    expect(screen.getByText("Change summary")).toBeInTheDocument()
    expect(screen.getByText("Temporary migration note.")).toBeInTheDocument()
  })

  it("shows the identical-state badge and collapsed note in compare mode", () => {
    render(
      <TourStep
        step={step}
        lessonSlug="pipes-and-flow"
        steps={[step]}
        currentStepIndex={0}
        completedStepIds={new Set()}
        onStepCompleted={() => {}}
        mode="compare"
        compareView={identicalCompareView}
      />
    )

    expect(screen.getByText("No v4 changes")).toBeInTheDocument()
    expect(screen.getByText("v3 and v4beta are identical for this step.")).toBeInTheDocument()
    expect(screen.getByText("No v4beta changes are staged for this step yet.")).not.toBeVisible()
  })
})
