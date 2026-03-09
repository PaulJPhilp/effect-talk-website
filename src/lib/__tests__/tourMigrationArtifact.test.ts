import { describe, expect, it } from "vitest"
import { buildTourArtifactStepKey, indexTourMigrationArtifact, validateTourMigrationArtifact, type TourMigrationArtifact } from "@/lib/tourMigrationArtifact"

const artifact: TourMigrationArtifact = {
  lessonCount: 1,
  stepCount: 2,
  snippetCount: 4,
  lessons: [
    {
      slug: "effects-are-lazy",
      steps: [
        {
          orderIndex: 1,
          migratedConceptCode: "v4 concept 1",
          migratedSolutionCode: "v4 solution 1",
        },
        {
          orderIndex: 2,
          migratedConceptCode: "v4 concept 2",
          migratedSolutionCode: "v4 solution 2",
        },
      ],
    },
  ],
}

describe("tourMigrationArtifact", () => {
  it("indexes steps by lesson slug and step order", () => {
    const stepMap = indexTourMigrationArtifact(artifact)

    expect(stepMap.get(buildTourArtifactStepKey("effects-are-lazy", 2))).toMatchObject({
      migratedConceptCode: "v4 concept 2",
      migratedSolutionCode: "v4 solution 2",
    })
  })

  it("fails when a required step is missing", () => {
    expect(() =>
      validateTourMigrationArtifact(
        {
          ...artifact,
          lessonCount: 2,
          stepCount: 3,
          snippetCount: 6,
        },
        [
        {
          slug: "effects-are-lazy",
          steps: [{ orderIndex: 1 }, { orderIndex: 2 }],
        },
        {
          slug: "async-effects",
          steps: [{ orderIndex: 3 }],
        },
      ]
      )
    ).toThrow(/missing async-effects step 3/i)
  })

  it("throws on duplicate step orderIndex within a lesson", () => {
    expect(() =>
      indexTourMigrationArtifact({
        ...artifact,
        lessons: [
          {
            slug: "effects-are-lazy",
            steps: [
              { orderIndex: 1, migratedConceptCode: "a", migratedSolutionCode: "b" },
              { orderIndex: 1, migratedConceptCode: "c", migratedSolutionCode: "d" },
            ],
          },
        ],
      })
    ).toThrow(/duplicate step entry.*effects-are-lazy.*step 1/i)
  })

  it("fails when counts drift", () => {
    expect(() =>
      validateTourMigrationArtifact(
        {
          ...artifact,
          snippetCount: 999,
        },
        [
          {
            slug: "effects-are-lazy",
            steps: [{ orderIndex: 1 }, { orderIndex: 2 }],
          },
        ]
      )
    ).toThrow(/snippet count mismatch/i)
  })
})
