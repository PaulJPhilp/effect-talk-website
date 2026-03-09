import { describe, expect, it } from "vitest"
import { mapLesson, mapStep, mapStepWithPatternNew, mapProgress } from "@/services/TourProgress/helpers"

const createdAt = new Date("2026-03-08T00:00:00.000Z")

const stepRow = {
  id: "step-1",
  lessonId: "lesson-1",
  orderIndex: 1,
  title: "Step",
  instruction: "Instruction",
  conceptCode: "v3 concept",
  conceptCodeV4: "v4 concept",
  conceptCodeLanguage: "typescript",
  solutionCode: "v3 solution",
  solutionCodeV4: "v4 solution",
  playgroundUrl: null,
  hints: ["Hint"],
  feedbackOnComplete: "Nice work",
  patternId: null,
  createdAt,
} as never

describe("TourProgress helpers", () => {
  it("maps v4 tour step fields when present", () => {
    expect(mapStep(stepRow)).toMatchObject({
      concept_code: "v3 concept",
      concept_code_v4: "v4 concept",
      solution_code: "v3 solution",
      solution_code_v4: "v4 solution",
      created_at: createdAt.toISOString(),
    })
  })

  it("mapLesson converts DB row to domain type", () => {
    const result = mapLesson({
      id: "lesson-1",
      slug: "effects-are-lazy",
      title: "Effects Are Lazy",
      description: "Learn about laziness",
      orderIndex: 1,
      group: "basics",
      difficulty: "beginner",
      estimatedMinutes: 10,
      createdAt,
    } as never)

    expect(result).toEqual({
      id: "lesson-1",
      slug: "effects-are-lazy",
      title: "Effects Are Lazy",
      description: "Learn about laziness",
      order_index: 1,
      group: "basics",
      difficulty: "beginner",
      estimated_minutes: 10,
      created_at: createdAt.toISOString(),
    })
  })

  it("mapProgress converts DB row to domain type", () => {
    const completedAt = new Date("2026-03-09T00:00:00.000Z")
    const result = mapProgress({
      id: "prog-1",
      userId: "user-1",
      stepId: "step-1",
      status: "completed",
      feedback: "Great",
      completedAt,
      createdAt,
    } as never)

    expect(result).toEqual({
      id: "prog-1",
      user_id: "user-1",
      step_id: "step-1",
      status: "completed",
      feedback: "Great",
      completed_at: completedAt.toISOString(),
      created_at: createdAt.toISOString(),
    })
  })

  describe("mapStepWithPatternNew", () => {
    it("marks pattern_new when release version meets cutoff", () => {
      const result = mapStepWithPatternNew({
        ...(stepRow as Record<string, unknown>),
        patternReleaseVersion: "0.12.0",
      } as never)
      expect(result.pattern_new).toBe(true)
    })

    it("does not mark pattern_new when release version is below cutoff", () => {
      const result = mapStepWithPatternNew({
        ...(stepRow as Record<string, unknown>),
        patternReleaseVersion: "0.11.0",
      } as never)
      expect(result.pattern_new).toBeUndefined()
    })

    it("handles semver correctly at version boundaries (1.0.0 > 0.12.0)", () => {
      const result = mapStepWithPatternNew({
        ...(stepRow as Record<string, unknown>),
        patternReleaseVersion: "1.0.0",
      } as never)
      expect(result.pattern_new).toBe(true)
    })

    it("handles the pre-1.0 edge case that breaks string comparison (0.9.0 < 0.12.0)", () => {
      const result = mapStepWithPatternNew({
        ...(stepRow as Record<string, unknown>),
        patternReleaseVersion: "0.9.0",
      } as never)
      expect(result.pattern_new).toBeUndefined()
    })

    it("does not mark pattern_new when release version is null", () => {
      const result = mapStepWithPatternNew({
        ...(stepRow as Record<string, unknown>),
        patternReleaseVersion: null,
      } as never)
      expect(result.pattern_new).toBeUndefined()
    })
  })
})
