import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { REQUIRED_TOUR_TRANSFORM_PROFILE } from "@/lib/tourMigrationArtifact"
import { loadTourMigrationMetadata, runTourV4Qa } from "@/lib/tourV4Qa"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const tempDir = tempDirs.pop()
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }
  vi.unstubAllGlobals()
})

function createTempDir(): string {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "tour-v4-qa-"))
  tempDirs.push(tempDir)
  return tempDir
}

function writeDocsFile(root: string, relativePath: string, conceptCode: string, solutionCode: string): void {
  const absolutePath = path.join(root, relativePath)
  writeFileSync(
    absolutePath,
    `\`\`\`ts title="concept"\n${conceptCode}\n\`\`\`\n\n\`\`\`ts title="solution"\n${solutionCode}\n\`\`\`\n`,
    "utf8"
  )
}

describe("tourV4Qa", () => {
  it("loads tool-emitted migration metadata", () => {
    const tempDir = createTempDir()
    const filePath = path.join(tempDir, "tour-v4-metadata.json")

    writeFileSync(
      filePath,
      JSON.stringify({
        metadataVersion: 1,
        artifactVersion: 3,
        generatorVersion: "0.1.0",
        mappingVersion: "abc123",
        generatedAt: "2026-03-09T00:00:00.000Z",
        transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
        reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
        blockedV3Apis: ["Effect.zipPar"],
        blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
      })
    )

    expect(loadTourMigrationMetadata(filePath)).toEqual({
      metadataVersion: 1,
      artifactVersion: 3,
      generatorVersion: "0.1.0",
      mappingVersion: "abc123",
      generatedAt: "2026-03-09T00:00:00.000Z",
      transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
      reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
      blockedV3Apis: ["Effect.zipPar"],
      blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
    })
  })

  it("marks removed historical v3 APIs as historical-v3-skipped while still validating v4", async () => {
    const tempDir = createTempDir()
    const manifestPath = path.join(tempDir, "tour-manifest.json")
    const artifactPath = path.join(tempDir, "tour-v4-snippets.json")
    const metadataPath = path.join(tempDir, "tour-v4-metadata.json")

    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        title: "Effect Tour",
        lessons: [
          {
            slug: "parallel",
            title: "Parallel",
            description: "desc",
            orderIndex: 1,
            group: "Concurrency",
            difficulty: "intermediate",
            estimatedMinutes: 10,
            steps: [
              {
                orderIndex: 1,
                title: "zipPar step",
                instruction: "Instruction",
                conceptCodeLanguage: "typescript",
                patternTitle: null,
                playgroundUrl: null,
                hints: [],
                feedbackOnComplete: null,
                sources: {
                  concept: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "parallel/01.mdx",
                    selector: { type: "fence-title", value: "concept" },
                  },
                  solution: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "parallel/01.mdx",
                    selector: { type: "fence-title", value: "solution" },
                  },
                },
                expectedMigrationPolicy: "review-needed",
                v4ValidationPath: "runtime-approved-rule",
              },
            ],
          },
        ],
      }),
      "utf8"
    )

    const artifact = {
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
      sourceManifestPath: manifestPath,
      sourceDocsRoot: tempDir,
      transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
      lessonCount: 1,
      stepCount: 1,
      snippetCount: 2,
      lessons: [
        {
          slug: "parallel",
          steps: [
            {
              orderIndex: 1,
              title: "zipPar step",
              conceptCode: ['import { Effect } from "effect"', "const noop = 1"].join("\n"),
              solutionCode: [
                'import { Effect } from "effect"',
                'const left = Effect.succeed("A")',
                'const right = Effect.succeed("B")',
                'const program = Effect.zipPar(left, right).pipe(Effect.tap(([a, b]) => Effect.sync(() => console.log(a, b))))',
                "Effect.runPromise(program)",
              ].join("\n"),
              migratedConceptCode: ['import { Effect } from "effect"', "const noop = 1"].join("\n"),
              migratedSolutionCode: [
                'import { Effect } from "effect"',
                'const left = Effect.succeed("A")',
                'const right = Effect.succeed("B")',
                'const program = Effect.zip(left, right, { concurrent: true }).pipe(Effect.tap(([a, b]) => Effect.sync(() => console.log(a, b))))',
                "Effect.runPromise(program)",
              ].join("\n"),
              conceptChanged: false,
              solutionChanged: true,
              conceptHasManualReview: false,
              solutionHasManualReview: false,
              migrationStatus: "review-needed",
              expectedMigrationPolicy: "review-needed",
              v4ValidationPath: "runtime-approved-rule",
              conceptProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "parallel/01.mdx",
                selector: { type: "fence-title", value: "concept" },
                contentHash: "hash-concept",
              },
              solutionProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "parallel/01.mdx",
                selector: { type: "fence-title", value: "solution" },
                contentHash: "hash-solution",
              },
              conceptDiagnostics: [],
              solutionDiagnostics: [],
              conceptMigrationReport: {
                snippetId: "parallel:1:concept",
                originalCode: ['import { Effect } from "effect"', "const noop = 1"].join("\n"),
                primitives: [],
                resultCode: ['import { Effect } from "effect"', "const noop = 1"].join("\n"),
                snippetStatus: "unchanged",
              },
              solutionMigrationReport: {
                snippetId: "parallel:1:solution",
                originalCode: [
                  'import { Effect } from "effect"',
                  'const left = Effect.succeed("A")',
                  'const right = Effect.succeed("B")',
                  'const program = Effect.zipPar(left, right).pipe(Effect.tap(([a, b]) => Effect.sync(() => console.log(a, b))))',
                  "Effect.runPromise(program)",
                ].join("\n"),
                primitives: [
                  { id: "Effect:Effect.succeed", original: "Effect.succeed", migrated: "Effect.succeed", migrationKind: "unchanged", status: "unchanged" },
                  { id: "Effect:Effect.zipPar", original: "Effect.zipPar", migrationKind: "review-needed", status: "review-needed" },
                ],
                resultCode: [
                  'import { Effect } from "effect"',
                  'const left = Effect.succeed("A")',
                  'const right = Effect.succeed("B")',
                  'const program = Effect.zip(left, right, { concurrent: true }).pipe(Effect.tap(([a, b]) => Effect.sync(() => console.log(a, b))))',
                  "Effect.runPromise(program)",
                ].join("\n"),
                snippetStatus: "review-needed",
              },
              conceptMatchedPatternIds: [],
              solutionMatchedPatternIds: ["Effect:Effect.succeed", "Effect:Effect.zipPar"],
              reviewRequiredReasonCodes: ["MANUAL_AST_CONTEXT_REQUIRED"],
            },
          ],
        },
      ],
    }

    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")
    writeFileSync(metadataPath, `${JSON.stringify(artifact.metadata, null, 2)}\n`, "utf8")

    const report = await runTourV4Qa({
      projectRoot: process.cwd(),
      manifestPath,
      artifactPath,
      metadataPath,
    })

    expect(report.summary.failed).toBe(0)
    expect(report.summary.reviewNeededCount).toBe(1)
    expect(report.results[0]).toMatchObject({
      comparisonMode: "historical-v3-skipped",
      migrationStatus: "review-needed",
      failures: [],
    })
  }, 15_000)

  it("still validates both sides when a changed v3 API remains compilable", { timeout: 15_000 }, async () => {
    const tempDir = createTempDir()
    const manifestPath = path.join(tempDir, "tour-manifest.json")
    const artifactPath = path.join(tempDir, "tour-v4-snippets.json")
    const metadataPath = path.join(tempDir, "tour-v4-metadata.json")

    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        title: "Effect Tour",
        lessons: [
          {
            slug: "schema",
            title: "Schema",
            description: "desc",
            orderIndex: 1,
            group: "Validation",
            difficulty: "intermediate",
            estimatedMinutes: 10,
            steps: [
              {
                orderIndex: 1,
                title: "Either zipWith",
                instruction: "Instruction",
                conceptCodeLanguage: "typescript",
                patternTitle: null,
                playgroundUrl: null,
                hints: [],
                feedbackOnComplete: null,
                sources: {
                  concept: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "schema/01.mdx",
                    selector: { type: "fence-title", value: "concept" },
                  },
                  solution: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "schema/01.mdx",
                    selector: { type: "fence-title", value: "solution" },
                  },
                },
                expectedMigrationPolicy: "auto",
                v4ValidationPath: "runtime-approved-rule",
              },
            ],
          },
        ],
      }),
      "utf8"
    )

    const artifact = {
      version: 3,
      metadata: {
        metadataVersion: 1,
        artifactVersion: 3,
        generatorVersion: "0.1.0",
        mappingVersion: "abc123",
        generatedAt: "2026-03-09T00:00:00.000Z",
        transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
        reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
        blockedV3Apis: ["Either.zipWith"],
        blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
      },
      sourceManifestPath: manifestPath,
      sourceDocsRoot: tempDir,
      transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
      lessonCount: 1,
      stepCount: 1,
      snippetCount: 2,
      lessons: [
        {
          slug: "schema",
          steps: [
            {
              orderIndex: 1,
              title: "Either zipWith",
              conceptCode: ['import { Either } from "effect"', "const noop = 1"].join("\n"),
              solutionCode: [
                'import { Either } from "effect"',
                "const merge = (a: number, b: number) => a + b",
                "const result = Either.zipWith(Either.right(1), Either.right(2), merge)",
                "if (Either.isRight(result)) {",
                "  console.log(result.right)",
                "}",
              ].join("\n"),
              migratedConceptCode: ['import { Either } from "effect"', "const noop = 1"].join("\n"),
              migratedSolutionCode: [
                'import { Either } from "effect"',
                "const merge = (a: number, b: number) => a + b",
                "const result = Either.all([Either.right(1), Either.right(2)]).pipe(Either.map(([left, right]) => merge(left, right)))",
                "if (Either.isRight(result)) {",
                "  console.log(result.right)",
                "}",
              ].join("\n"),
              conceptChanged: false,
              solutionChanged: true,
              conceptHasManualReview: false,
              solutionHasManualReview: false,
              migrationStatus: "auto-certified",
              expectedMigrationPolicy: "auto",
              v4ValidationPath: "runtime-approved-rule",
              conceptProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "schema/01.mdx",
                selector: { type: "fence-title", value: "concept" },
                contentHash: "hash-concept",
              },
              solutionProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "schema/01.mdx",
                selector: { type: "fence-title", value: "solution" },
                contentHash: "hash-solution",
              },
              conceptDiagnostics: [],
              solutionDiagnostics: [],
              conceptMigrationReport: {
                snippetId: "schema:1:concept",
                originalCode: ['import { Either } from "effect"', "const noop = 1"].join("\n"),
                primitives: [],
                resultCode: ['import { Either } from "effect"', "const noop = 1"].join("\n"),
                snippetStatus: "unchanged",
              },
              solutionMigrationReport: {
                snippetId: "schema:1:solution",
                originalCode: [
                  'import { Either } from "effect"',
                  "const merge = (a: number, b: number) => a + b",
                  "const result = Either.zipWith(Either.right(1), Either.right(2), merge)",
                  "if (Either.isRight(result)) {",
                  "  console.log(result.right)",
                  "}",
                ].join("\n"),
                primitives: [
                  { id: "Either:Either.zipWith", original: "Either.zipWith", migrated: "Either.all([...] )", migrationKind: "structural", status: "migrated" },
                ],
                resultCode: [
                  'import { Either } from "effect"',
                  "const merge = (a: number, b: number) => a + b",
                  "const result = Either.all([Either.right(1), Either.right(2)]).pipe(Either.map(([left, right]) => merge(left, right)))",
                  "if (Either.isRight(result)) {",
                  "  console.log(result.right)",
                  "}",
                ].join("\n"),
                snippetStatus: "auto-certified",
              },
              conceptMatchedPatternIds: [],
              solutionMatchedPatternIds: ["Either:Either.zipWith"],
              reviewRequiredReasonCodes: [],
            },
          ],
        },
      ],
    }

    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")
    writeFileSync(metadataPath, `${JSON.stringify(artifact.metadata, null, 2)}\n`, "utf8")

    const emptyStream = () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        },
      })

    vi.stubGlobal("Bun", {
      spawn: () => ({
        stdout: emptyStream(),
        stderr: emptyStream(),
        exited: Promise.resolve(0),
        signalCode: null,
      }),
    })

    const report = await runTourV4Qa({
      projectRoot: process.cwd(),
      manifestPath,
      artifactPath,
      metadataPath,
    })

    expect(report.summary.failed).toBe(0)
    expect(report.results[0]).toMatchObject({
      comparisonMode: "validated",
      migrationStatus: "auto-certified",
      failures: [],
    })
  })

  it("fails auto-certified steps that still carry review-required reason codes", async () => {
    const tempDir = createTempDir()
    const manifestPath = path.join(tempDir, "tour-manifest.json")
    const artifactPath = path.join(tempDir, "tour-v4-snippets.json")
    const metadataPath = path.join(tempDir, "tour-v4-metadata.json")

    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        title: "Effect Tour",
        lessons: [
          {
            slug: "schema",
            title: "Schema",
            description: "desc",
            orderIndex: 1,
            group: "Validation",
            difficulty: "intermediate",
            estimatedMinutes: 10,
            steps: [
              {
                orderIndex: 1,
                title: "Bad auto-certified",
                instruction: "Instruction",
                conceptCodeLanguage: "typescript",
                patternTitle: null,
                playgroundUrl: null,
                hints: [],
                feedbackOnComplete: null,
                sources: {
                  concept: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "schema/02.mdx",
                    selector: { type: "fence-title", value: "concept" },
                  },
                  solution: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "schema/02.mdx",
                    selector: { type: "fence-title", value: "solution" },
                  },
                },
                expectedMigrationPolicy: "auto",
                v4ValidationPath: "runtime-approved-rule",
              },
            ],
          },
        ],
      }),
      "utf8"
    )

    const artifact = {
      version: 3,
      metadata: {
        metadataVersion: 1,
        artifactVersion: 3,
        generatorVersion: "0.1.0",
        mappingVersion: "abc123",
        generatedAt: "2026-03-09T00:00:00.000Z",
        transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
        reviewRequiredReasonCodes: ["MANUAL_AST_CONTEXT_REQUIRED"],
        blockedV3Apis: ["Effect.zipPar"],
        blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
      },
      sourceManifestPath: manifestPath,
      sourceDocsRoot: tempDir,
      transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
      lessonCount: 1,
      stepCount: 1,
      snippetCount: 2,
      lessons: [
        {
          slug: "schema",
          steps: [
            {
              orderIndex: 1,
              title: "Bad auto-certified",
              conceptCode: ['import { Effect } from "effect"', "const noop = 1"].join("\n"),
              solutionCode: [
                'import { Effect } from "effect"',
                'const left = Effect.succeed("A")',
                'const right = Effect.succeed("B")',
                "const program = Effect.zipPar(left, right)",
              ].join("\n"),
              migratedConceptCode: ['import { Effect } from "effect"', "const noop = 1"].join("\n"),
              migratedSolutionCode: [
                'import { Effect } from "effect"',
                'const left = Effect.succeed("A")',
                'const right = Effect.succeed("B")',
                "const program = Effect.zip(left, right, { concurrent: true })",
              ].join("\n"),
              conceptChanged: false,
              solutionChanged: true,
              conceptHasManualReview: false,
              solutionHasManualReview: false,
              migrationStatus: "auto-certified",
              expectedMigrationPolicy: "auto",
              v4ValidationPath: "runtime-approved-rule",
              conceptProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "schema/02.mdx",
                selector: { type: "fence-title", value: "concept" },
                contentHash: "hash-concept",
              },
              solutionProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "schema/02.mdx",
                selector: { type: "fence-title", value: "solution" },
                contentHash: "hash-solution",
              },
              conceptDiagnostics: [],
              solutionDiagnostics: [],
              conceptMatchedPatternIds: [],
              solutionMatchedPatternIds: ["Effect:Effect.succeed", "Effect:Effect.zipPar"],
              reviewRequiredReasonCodes: ["MANUAL_AST_CONTEXT_REQUIRED"],
            },
          ],
        },
      ],
    }

    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")
    writeFileSync(metadataPath, `${JSON.stringify(artifact.metadata, null, 2)}\n`, "utf8")

    const report = await runTourV4Qa({
      projectRoot: process.cwd(),
      manifestPath,
      artifactPath,
      metadataPath,
    })

    expect(report.summary.failed).toBe(1)
    expect(report.results[0]?.failures).toContain("auto-certified step still contains manual-review markers")
  }, 15_000)

  it("fails when the embedded snippet report disagrees with migrated code", async () => {
    const tempDir = createTempDir()
    const manifestPath = path.join(tempDir, "tour-manifest.json")
    const artifactPath = path.join(tempDir, "tour-v4-snippets.json")

    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        title: "Effect Tour",
        lessons: [
          {
            slug: "schema",
            title: "Schema",
            description: "desc",
            orderIndex: 1,
            group: "Validation",
            difficulty: "intermediate",
            estimatedMinutes: 10,
            steps: [
              {
                orderIndex: 1,
                title: "Mismatch",
                instruction: "Instruction",
                conceptCodeLanguage: "typescript",
                patternTitle: null,
                playgroundUrl: null,
                hints: [],
                feedbackOnComplete: null,
                sources: {
                  concept: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "schema/03.mdx",
                    selector: { type: "fence-title", value: "concept" },
                  },
                  solution: {
                    docsRef: "bootstrap-seed-snapshot",
                    filePath: "schema/03.mdx",
                    selector: { type: "fence-title", value: "solution" },
                  },
                },
                expectedMigrationPolicy: "auto",
                v4ValidationPath: "runtime-approved-rule",
              },
            ],
          },
        ],
      }),
      "utf8"
    )

    const artifact = {
      version: 3,
      metadata: {
        metadataVersion: 1,
        artifactVersion: 3,
        generatorVersion: "0.1.0",
        mappingVersion: "abc123",
        generatedAt: "2026-03-09T00:00:00.000Z",
        transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
        reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
        blockedV3Apis: [],
        blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
      },
      sourceManifestPath: manifestPath,
      sourceDocsRoot: tempDir,
      transformProfile: REQUIRED_TOUR_TRANSFORM_PROFILE,
      lessonCount: 1,
      stepCount: 1,
      snippetCount: 2,
      lessons: [
        {
          slug: "schema",
          steps: [
            {
              orderIndex: 1,
              title: "Mismatch",
              conceptCode: "const noop = 1",
              solutionCode: "const noop = 1",
              migratedConceptCode: "const noop = 2",
              migratedSolutionCode: "const noop = 1",
              conceptChanged: true,
              solutionChanged: false,
              conceptHasManualReview: false,
              solutionHasManualReview: false,
              migrationStatus: "auto-certified",
              expectedMigrationPolicy: "auto",
              v4ValidationPath: "runtime-approved-rule",
              conceptProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "schema/03.mdx",
                selector: { type: "fence-title", value: "concept" },
                contentHash: "hash-concept",
              },
              solutionProvenance: {
                docsRef: "bootstrap-seed-snapshot",
                filePath: "schema/03.mdx",
                selector: { type: "fence-title", value: "solution" },
                contentHash: "hash-solution",
              },
              conceptMigrationReport: {
                snippetId: "schema:1:concept",
                originalCode: "const noop = 1",
                primitives: [],
                resultCode: "const noop = 999",
                snippetStatus: "auto-certified",
              },
              solutionMigrationReport: {
                snippetId: "schema:1:solution",
                originalCode: "const noop = 1",
                primitives: [],
                resultCode: "const noop = 1",
                snippetStatus: "unchanged",
              },
              conceptMatchedPatternIds: [],
              solutionMatchedPatternIds: [],
              reviewRequiredReasonCodes: [],
            },
          ],
        },
      ],
    }

    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")

    const emptyStream = () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        },
      })

    vi.stubGlobal("Bun", {
      spawn: () => ({
        stdout: emptyStream(),
        stderr: emptyStream(),
        exited: Promise.resolve(0),
        signalCode: null,
      }),
    })

    const report = await runTourV4Qa({
      projectRoot: process.cwd(),
      manifestPath,
      artifactPath,
    })

    expect(report.summary.failed).toBe(1)
    expect(report.results[0]?.failures).toContain("concept migration report result does not match migrated concept code")
  })
})
