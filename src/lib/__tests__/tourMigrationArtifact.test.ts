import { describe, expect, it } from "vitest"
import {
  REQUIRED_TOUR_TRANSFORM_PROFILE,
  buildTourArtifactStepKey,
  indexTourMigrationArtifact,
  validateTourMigrationArtifact,
  type TourMigrationArtifact,
} from "@/lib/tourMigrationArtifact"
import type { TourManifest } from "@/lib/tourManifest"

const manifest: TourManifest = {
  version: 1,
  title: "Effect Tour",
  lessons: [
    {
      slug: "effects-are-lazy",
      title: "Effects Are Lazy Blueprints",
      description: "desc",
      orderIndex: 1,
      group: "Fundamentals",
      difficulty: "beginner",
      estimatedMinutes: 10,
      steps: [
        {
          orderIndex: 1,
          title: "Step 1",
          instruction: "Instruction",
          conceptCodeLanguage: "typescript",
          patternTitle: null,
          playgroundUrl: null,
          hints: [],
          feedbackOnComplete: null,
          sources: {
            concept: {
              docsRef: "bootstrap-seed-snapshot",
              filePath: "effects-are-lazy/01.mdx",
              selector: { type: "fence-title", value: "concept" },
            },
            solution: {
              docsRef: "bootstrap-seed-snapshot",
              filePath: "effects-are-lazy/01.mdx",
              selector: { type: "fence-title", value: "solution" },
            },
          },
          expectedMigrationPolicy: "review-needed",
          v4ValidationPath: "runtime-approved-rule",
        },
        {
          orderIndex: 2,
          title: "Step 2",
          instruction: "Instruction",
          conceptCodeLanguage: "typescript",
          patternTitle: null,
          playgroundUrl: null,
          hints: [],
          feedbackOnComplete: null,
          sources: {
            concept: {
              docsRef: "bootstrap-seed-snapshot",
              filePath: "effects-are-lazy/02.mdx",
              selector: { type: "fence-title", value: "concept" },
            },
            solution: {
              docsRef: "bootstrap-seed-snapshot",
              filePath: "effects-are-lazy/02.mdx",
              selector: { type: "fence-title", value: "solution" },
            },
          },
          expectedMigrationPolicy: "review-needed",
          v4ValidationPath: "runtime-approved-rule",
        },
      ],
    },
  ],
}

const artifact: TourMigrationArtifact = {
  version: 3,
  metadata: {
    metadataVersion: 1,
    artifactVersion: 3,
    generatorVersion: "0.1.0",
    mappingVersion: "abc123",
    generatedAt: "2026-03-09T00:00:00.000Z",
    transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
    reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
    blockedV3Apis: ["Effect.zipPar"],
    blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
  },
  sourceManifestPath: "/tmp/tour-manifest.json",
  sourceDocsRoot: "/tmp/content/tour-docs/v3",
  transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
  lessonCount: 1,
  stepCount: 2,
  snippetCount: 4,
  lessons: [
    {
      slug: "effects-are-lazy",
      steps: [
        {
          orderIndex: 1,
          conceptCode: "v3 concept 1",
          solutionCode: "v3 solution 1",
          migratedConceptCode: "v4 concept 1",
          migratedSolutionCode: "v4 solution 1",
          migrationStatus: "review-needed",
          conceptProvenance: {
            docsRef: "bootstrap-seed-snapshot",
            filePath: "effects-are-lazy/01.mdx",
            selector: { type: "fence-title", value: "concept" },
            contentHash: "hash-1",
          },
          solutionProvenance: {
            docsRef: "bootstrap-seed-snapshot",
            filePath: "effects-are-lazy/01.mdx",
            selector: { type: "fence-title", value: "solution" },
            contentHash: "hash-2",
          },
        },
        {
          orderIndex: 2,
          conceptCode: "v3 concept 2",
          solutionCode: "v3 solution 2",
          migratedConceptCode: "v4 concept 2",
          migratedSolutionCode: "v4 solution 2",
          migrationStatus: "review-needed",
          conceptProvenance: {
            docsRef: "bootstrap-seed-snapshot",
            filePath: "effects-are-lazy/02.mdx",
            selector: { type: "fence-title", value: "concept" },
            contentHash: "hash-3",
          },
          solutionProvenance: {
            docsRef: "bootstrap-seed-snapshot",
            filePath: "effects-are-lazy/02.mdx",
            selector: { type: "fence-title", value: "solution" },
            contentHash: "hash-4",
          },
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
        {
          ...manifest,
          lessons: [
            ...manifest.lessons,
            {
              slug: "async-effects",
              title: "Async Effects",
              description: "desc",
              orderIndex: 2,
              group: "Fundamentals",
              difficulty: "beginner",
              estimatedMinutes: 10,
              steps: [
                {
                  orderIndex: 3,
                  title: "Step 3",
                  instruction: "Instruction",
                  conceptCodeLanguage: "typescript",
                  patternTitle: null,
                  playgroundUrl: null,
                  hints: [],
                  feedbackOnComplete: null,
                  sources: {
                    concept: {
                      docsRef: "bootstrap-seed-snapshot",
                      filePath: "async-effects/03.mdx",
                      selector: { type: "fence-title", value: "concept" },
                    },
                    solution: {
                      docsRef: "bootstrap-seed-snapshot",
                      filePath: "async-effects/03.mdx",
                      selector: { type: "fence-title", value: "solution" },
                    },
                  },
                  expectedMigrationPolicy: "review-needed",
                  v4ValidationPath: "runtime-approved-rule",
                },
              ],
            },
          ],
        }
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
              {
                orderIndex: 1,
                migratedConceptCode: "a",
                migratedSolutionCode: "b",
                migrationStatus: "review-needed",
                conceptProvenance: artifact.lessons[0]!.steps[0]!.conceptProvenance,
                solutionProvenance: artifact.lessons[0]!.steps[0]!.solutionProvenance,
              },
              {
                orderIndex: 1,
                migratedConceptCode: "c",
                migratedSolutionCode: "d",
                migrationStatus: "review-needed",
                conceptProvenance: artifact.lessons[0]!.steps[1]!.conceptProvenance,
                solutionProvenance: artifact.lessons[0]!.steps[1]!.solutionProvenance,
              },
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
        manifest
      )
    ).toThrow(/snippet count mismatch/i)
  })

  it("fails on unsupported artifact versions", () => {
    expect(() =>
      validateTourMigrationArtifact(
        {
          ...artifact,
          version: 999,
          metadata: {
            ...artifact.metadata,
            artifactVersion: 999,
          },
        },
        manifest
      )
    ).toThrow(/unsupported tour v4 artifact version/i)
  })

  it("fails when contract metadata is missing", () => {
    expect(() =>
      validateTourMigrationArtifact(
        {
          ...(artifact as unknown as Record<string, unknown>),
          metadata: undefined,
        } as unknown as TourMigrationArtifact,
        manifest
      )
    ).toThrow(/missing contract metadata/i)
  })

  it("fails on unsupported transform profiles", () => {
    expect(() =>
      validateTourMigrationArtifact(
        {
          ...artifact,
          metadata: {
            ...artifact.metadata,
            transformProfile: "safe",
          },
          transformProfile: "safe",
        },
        manifest
      )
    ).toThrow(/unsupported tour v4 transform profile/i)
  })
})
