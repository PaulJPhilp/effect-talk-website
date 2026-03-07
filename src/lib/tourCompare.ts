import type { TourStep } from "@/services/TourProgress/types"

export interface TourCompareView {
  readonly v3Code: string
  readonly v4Code: string
  readonly changeSummary: string
  readonly identical: boolean
}

const EMPTY_COMPARE_CODE = [
  "// Comparison preview is not available for this step yet.",
  "// v4beta lesson content will be wired in a later pass.",
].join("\n")

function getBaseCode(step: TourStep): string {
  return step.solution_code ?? step.concept_code ?? EMPTY_COMPARE_CODE
}

export function getTemporaryTourCompareView(step: TourStep): TourCompareView {
  const v3Code = getBaseCode(step)
  const identical = step.order_index % 2 === 1

  if (identical) {
    return {
      v3Code,
      v4Code: v3Code,
      changeSummary: "No v4beta changes are staged for this step yet. The v3 and v4 lesson variants currently match.",
      identical: true,
    }
  }

  return {
    v3Code,
    v4Code: `${v3Code}\n\n// v4beta placeholder: this pane will render the refactored v4 lesson code.`,
    changeSummary: "Temporary comparison copy: the future v4beta lesson will highlight the refactored API shape, naming changes, and simplified composition flow here.",
    identical: false,
  }
}
