import { readFileSync } from "node:fs"
import path from "node:path"

export const SUPPORTED_TOUR_MANIFEST_VERSION = 1

export type TourExpectedMigrationPolicy = "auto" | "review-needed" | "unchanged"
export type TourV4ValidationPath = "runtime-approved-rule" | "current-docs-exact"

export interface TourSnippetSelector {
  readonly type: "fence-title"
  readonly value: string
}

export interface TourSnippetSource {
  readonly docsRef: string
  readonly filePath: string
  readonly selector: TourSnippetSelector
}

export interface TourManifestStep {
  readonly orderIndex: number
  readonly title: string
  readonly instruction: string
  readonly conceptCodeLanguage: string
  readonly patternTitle: string | null
  readonly playgroundUrl: string | null
  readonly hints: readonly string[]
  readonly feedbackOnComplete: string | null
  readonly sources: {
    readonly concept: TourSnippetSource
    readonly solution: TourSnippetSource
  }
  readonly currentDocsSources?: {
    readonly concept?: TourSnippetSource
    readonly solution?: TourSnippetSource
  }
  readonly expectedMigrationPolicy?: TourExpectedMigrationPolicy
  readonly v4ValidationPath?: TourV4ValidationPath
}

export interface TourManifestLesson {
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly orderIndex: number
  readonly group: string
  readonly difficulty: string
  readonly estimatedMinutes: number
  readonly steps: readonly TourManifestStep[]
}

export interface TourManifest {
  readonly version: number
  readonly title: string
  readonly generatedFromSeedPath?: string
  readonly generatedAt?: string
  readonly lessons: readonly TourManifestLesson[]
}

export interface IndexedTourManifestStep {
  readonly lesson: TourManifestLesson
  readonly step: TourManifestStep
}

export function buildTourManifestStepKey(lessonSlug: string, orderIndex: number): string {
  return `${lessonSlug}:${orderIndex}`
}

export function loadTourManifest(filePath: string): TourManifest {
  const resolvedPath = path.resolve(filePath)
  const manifest = JSON.parse(readFileSync(resolvedPath, "utf8")) as TourManifest

  if (manifest.version !== SUPPORTED_TOUR_MANIFEST_VERSION) {
    throw new Error(
      `Unsupported tour manifest version: expected ${SUPPORTED_TOUR_MANIFEST_VERSION}, received ${String(manifest.version)}`
    )
  }

  return manifest
}

export function indexTourManifest(manifest: TourManifest): ReadonlyMap<string, IndexedTourManifestStep> {
  const stepMap = new Map<string, IndexedTourManifestStep>()

  for (const lesson of manifest.lessons) {
    for (const step of lesson.steps) {
      const key = buildTourManifestStepKey(lesson.slug, step.orderIndex)
      if (stepMap.has(key)) {
        throw new Error(`Tour manifest contains a duplicate step entry for ${lesson.slug} step ${step.orderIndex}`)
      }
      stepMap.set(key, {
        lesson,
        step,
      })
    }
  }

  return stepMap
}

export function countTourManifestSteps(manifest: TourManifest): number {
  return manifest.lessons.reduce((total, lesson) => total + lesson.steps.length, 0)
}

export function countTourManifestSnippets(manifest: TourManifest): number {
  return countTourManifestSteps(manifest) * 2
}
