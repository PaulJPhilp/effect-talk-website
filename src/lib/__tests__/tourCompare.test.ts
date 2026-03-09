import { describe, expect, it } from "vitest"
import { getTourCompareView, getTourConceptCode, getTourSolutionCode } from "@/lib/tourCompare"
import type { TourStep } from "@/services/TourProgress/types"

const step: TourStep = {
  id: "step-1",
  lesson_id: "lesson-1",
  order_index: 1,
  title: "Step",
  instruction: "Instruction",
  concept_code: "v3 concept",
  concept_code_v4: "v4 concept",
  concept_code_language: "typescript",
  solution_code: "v3 solution",
  solution_code_v4: "v4 solution",
  playground_url: null,
  hints: null,
  feedback_on_complete: null,
  pattern_id: null,
  created_at: "2026-03-08T00:00:00.000Z",
}

describe("tourCompare", () => {
  it("returns v3 fields in v3 mode", () => {
    expect(getTourConceptCode(step, "v3")).toBe("v3 concept")
    expect(getTourSolutionCode(step, "v3")).toBe("v3 solution")
  })

  it("prefers v4 lesson variants in v4 mode", () => {
    expect(getTourConceptCode(step, "v4")).toBe("v4 concept")
    expect(getTourSolutionCode(step, "v4")).toBe("v4 solution")
  })

  it("falls back to v3 when v4 variants are missing", () => {
    expect(
      getTourCompareView({
        ...step,
        concept_code_v4: null,
        solution_code_v4: null,
      })
    ).toMatchObject({
      v3Code: "v3 solution",
      v4Code: "v3 solution",
      identical: true,
    })
  })

  it("marks compare output as changed when v4 content differs", () => {
    expect(getTourCompareView(step)).toMatchObject({
      v3Code: "v3 solution",
      v4Code: "v4 solution",
      identical: false,
      changeSummary: "This step is showing the generated v4 lesson variant alongside the current v3 version.",
    })
  })

  it("returns EMPTY_COMPARE_CODE on both sides when all code fields are null", () => {
    const emptyStep: TourStep = {
      ...step,
      concept_code: null,
      concept_code_v4: null,
      solution_code: null,
      solution_code_v4: null,
    }
    const view = getTourCompareView(emptyStep)
    expect(view.v3Code).toBe("// Comparison preview is not available for this step yet.")
    expect(view.v4Code).toBe("// Comparison preview is not available for this step yet.")
    expect(view.identical).toBe(true)
    expect(view.changeSummary).toBe("No API-level migration changes were needed for this step.")
  })
})
