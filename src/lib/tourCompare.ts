import type { TourStep } from "@/services/TourProgress/types"

export interface TourCompareView {
  readonly v3Code: string
  readonly v4Code: string
  readonly changeSummary: string
  readonly identical: boolean
}

export const EMPTY_COMPARE_CODE = "// Comparison preview is not available for this step yet."

export function getTourConceptCode(step: TourStep, mode: "v3" | "v4"): string | null {
  if (mode === "v4") {
    return step.concept_code_v4 ?? step.concept_code
  }
  return step.concept_code
}

export function getTourSolutionCode(step: TourStep, mode: "v3" | "v4"): string | null {
  if (mode === "v4") {
    return step.solution_code_v4 ?? step.solution_code
  }
  return step.solution_code
}

function getBaseCompareCode(step: TourStep, mode: "v3" | "v4"): string {
  return getTourSolutionCode(step, mode) ?? getTourConceptCode(step, mode) ?? EMPTY_COMPARE_CODE
}

export function getTourCompareView(step: TourStep): TourCompareView {
  const v3Code = getBaseCompareCode(step, "v3")
  const v4Code = getBaseCompareCode(step, "v4")
  const identical = v3Code === v4Code

  return {
    v3Code,
    v4Code,
    changeSummary: identical
      ? "No API-level migration changes were needed for this step."
      : "This step is showing the generated v4 lesson variant alongside the current v3 version.",
    identical,
  }
}
