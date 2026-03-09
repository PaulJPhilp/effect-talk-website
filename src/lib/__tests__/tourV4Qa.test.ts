import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { extractTourLessonsFromSeedFile, extractTourLessonsFromSeedSource, loadTourMigrationMetadata } from "@/lib/tourV4Qa"

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length > 0) {
    const tempDir = tempDirs.pop()
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }
})

function createTempFile(name: string, contents: string): string {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "tour-v4-qa-"))
  tempDirs.push(tempDir)
  const filePath = path.join(tempDir, name)
  writeFileSync(filePath, contents, "utf8")
  return filePath
}

describe("tourV4Qa helpers", () => {
  it("extracts lesson metadata from the real seed file", () => {
    const lessons = extractTourLessonsFromSeedFile(path.resolve(process.cwd(), "scripts/seed-tour.ts"))
    const effectChannels = lessons.find((lesson) => lesson.slug === "effect-channels")

    expect(lessons).toHaveLength(18)
    expect(effectChannels?.steps[0]).toMatchObject({
      orderIndex: 1,
      title: "The Three Channels: Success, Error, and Requirements",
    })
    expect(effectChannels?.steps[0]?.solutionCode).toContain('Data.tagged<UserNotFoundError>("UserNotFoundError")')
  })

  it("parses a minimal seed source fixture", () => {
    const lessons = extractTourLessonsFromSeedSource(
      `
      const lesson1Steps = [
        {
          orderIndex: 1,
          title: "Step title",
          conceptCode: "const concept = 1",
          conceptCodeLanguage: "typescript",
          solutionCode: "const solution = 2"
        }
      ]

      const allLessons = [
        {
          slug: "lesson-slug",
          title: "Lesson title",
          steps: lesson1Steps
        }
      ]
      `,
      "/tmp/seed-tour.ts"
    )

    expect(lessons).toEqual([
      {
        slug: "lesson-slug",
        title: "Lesson title",
        steps: [
          {
            slug: "lesson-slug",
            lessonTitle: "Lesson title",
            orderIndex: 1,
            title: "Step title",
            conceptCode: "const concept = 1",
            solutionCode: "const solution = 2",
            conceptCodeLanguage: "typescript",
          },
        ],
      },
    ])
  })

  it("loads tool-emitted migration metadata", () => {
    const filePath = createTempFile(
      "tour-v4-metadata.json",
      JSON.stringify({
        metadataVersion: 1,
        artifactVersion: 2,
        generatorVersion: "0.1.0",
        mappingVersion: "abc123",
        generatedAt: "2026-03-09T00:00:00.000Z",
        transformProfile: "safe",
        reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
        blockedV3Apis: ["Effect.zipPar"],
        blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
      })
    )

    expect(loadTourMigrationMetadata(filePath)).toEqual({
      metadataVersion: 1,
      artifactVersion: 2,
      generatorVersion: "0.1.0",
      mappingVersion: "abc123",
      generatedAt: "2026-03-09T00:00:00.000Z",
      transformProfile: "safe",
      reviewRequiredReasonCodes: ["MANUAL_AMBIGUOUS"],
      blockedV3Apis: ["Effect.zipPar"],
      blockedMappingKinds: ["structural", "ambiguous", "deprecated", "unknown"],
    })
  })
})
