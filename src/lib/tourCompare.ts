import type { TourStep } from "@/services/TourProgress/types";

export interface TourCompareView {
  readonly changeSummary: string;
  readonly conceptIdentical: boolean;
  readonly identical: boolean;
  readonly selectedSnippet: "concept" | "solution";
  readonly solutionIdentical: boolean;
  readonly v3Code: string;
  readonly v4Code: string;
}

export const EMPTY_COMPARE_CODE =
  "// Comparison preview is not available for this step yet.";

export function getTourConceptCode(
  step: TourStep,
  mode: "v3" | "v4"
): string | null {
  if (mode === "v4") {
    return step.concept_code_v4 ?? step.concept_code;
  }
  return step.concept_code;
}

export function getTourSolutionCode(
  step: TourStep,
  mode: "v3" | "v4"
): string | null {
  if (mode === "v4") {
    return step.solution_code_v4 ?? step.solution_code;
  }
  return step.solution_code;
}

function summarizeDiffs(
  conceptIdentical: boolean,
  solutionIdentical: boolean
): string {
  if (conceptIdentical && solutionIdentical) {
    return "No API-level migration changes were needed for this step.";
  }
  if (!(conceptIdentical || solutionIdentical)) {
    return "Both the anti-pattern and solution snippets differ between the pinned v3 source and the generated v4 variant.";
  }
  if (!conceptIdentical) {
    return "The anti-pattern snippet differs between the pinned v3 source and the generated v4 variant.";
  }
  return "The solution snippet differs between the pinned v3 source and the generated v4 variant.";
}

export function getTourCompareView(step: TourStep): TourCompareView {
  const conceptV3 = getTourConceptCode(step, "v3") ?? EMPTY_COMPARE_CODE;
  const conceptV4 = getTourConceptCode(step, "v4") ?? EMPTY_COMPARE_CODE;
  const solutionV3 = getTourSolutionCode(step, "v3") ?? EMPTY_COMPARE_CODE;
  const solutionV4 = getTourSolutionCode(step, "v4") ?? EMPTY_COMPARE_CODE;
  const conceptIdentical = conceptV3 === conceptV4;
  const solutionIdentical = solutionV3 === solutionV4;
  const identical = conceptIdentical && solutionIdentical;
  const selectedSnippet =
    getTourSolutionCode(step, "v3") !== null ||
    getTourSolutionCode(step, "v4") !== null
      ? "solution"
      : "concept";
  const v3Code = selectedSnippet === "solution" ? solutionV3 : conceptV3;
  const v4Code = selectedSnippet === "solution" ? solutionV4 : conceptV4;

  return {
    v3Code,
    v4Code,
    changeSummary: summarizeDiffs(conceptIdentical, solutionIdentical),
    identical,
    selectedSnippet,
    conceptIdentical,
    solutionIdentical,
  };
}
