export const SUPPORTED_TOUR_ARTIFACT_VERSION = 2
export const SUPPORTED_TOUR_METADATA_VERSION = 1

export interface TourMigrationContractMetadata {
  readonly metadataVersion: number
  readonly artifactVersion: number
  readonly generatorVersion: string
  readonly mappingVersion: string
  readonly generatedAt: string
  readonly transformProfile: string
  readonly reviewRequiredReasonCodes: readonly string[]
  readonly blockedV3Apis: readonly string[]
  readonly blockedMappingKinds: readonly string[]
}

export interface TourMigrationArtifactStep {
  readonly orderIndex: number
  readonly title?: string
  readonly conceptCode?: string
  readonly solutionCode?: string
  readonly conceptCodeLanguage?: string
  readonly migratedConceptCode: string
  readonly migratedSolutionCode: string
  readonly conceptChanged?: boolean
  readonly solutionChanged?: boolean
  readonly conceptHasManualReview?: boolean
  readonly solutionHasManualReview?: boolean
  readonly conceptDiagnostics?: readonly unknown[]
  readonly solutionDiagnostics?: readonly unknown[]
}

export interface TourMigrationArtifactLesson {
  readonly slug: string
  readonly title?: string
  readonly description?: string
  readonly orderIndex?: number
  readonly group?: string
  readonly difficulty?: string
  readonly estimatedMinutes?: number
  readonly steps: readonly TourMigrationArtifactStep[]
}

export interface TourMigrationArtifact {
  readonly version: number
  readonly metadata: TourMigrationContractMetadata
  readonly sourceSeedPath?: string
  readonly transformProfile?: string
  readonly lessonCount: number
  readonly stepCount: number
  readonly snippetCount: number
  readonly generatedAt?: string
  readonly lessons: readonly TourMigrationArtifactLesson[]
}

type ArtifactLessonLike = {
  readonly slug: string
  readonly steps: readonly { readonly orderIndex: number }[]
}

export function buildTourArtifactStepKey(lessonSlug: string, orderIndex: number): string {
  return `${lessonSlug}:${orderIndex}`
}

export function indexTourMigrationArtifact(
  artifact: TourMigrationArtifact
): ReadonlyMap<string, TourMigrationArtifactStep> {
  const stepMap = new Map<string, TourMigrationArtifactStep>()

  for (const lesson of artifact.lessons) {
    for (const step of lesson.steps) {
      const key = buildTourArtifactStepKey(lesson.slug, step.orderIndex)
      if (stepMap.has(key)) {
        throw new Error(`Tour v4 artifact contains a duplicate step entry for ${lesson.slug} step ${step.orderIndex}`)
      }
      stepMap.set(key, step)
    }
  }

  return stepMap
}

export function validateTourMigrationArtifact(
  artifact: TourMigrationArtifact,
  lessons: readonly ArtifactLessonLike[]
): ReadonlyMap<string, TourMigrationArtifactStep> {
  if (!artifact || typeof artifact !== "object") {
    throw new Error("Tour v4 artifact is missing or invalid")
  }
  if (!("metadata" in artifact) || !artifact.metadata) {
    throw new Error("Tour v4 artifact is missing contract metadata")
  }
  if (artifact.version !== SUPPORTED_TOUR_ARTIFACT_VERSION) {
    throw new Error(
      `Unsupported tour v4 artifact version: expected ${SUPPORTED_TOUR_ARTIFACT_VERSION}, received ${artifact.version}`
    )
  }
  if (artifact.metadata.metadataVersion !== SUPPORTED_TOUR_METADATA_VERSION) {
    throw new Error(
      `Unsupported tour v4 metadata version: expected ${SUPPORTED_TOUR_METADATA_VERSION}, received ${artifact.metadata.metadataVersion}`
    )
  }
  if (artifact.metadata.artifactVersion !== artifact.version) {
    throw new Error(
      `Tour v4 artifact metadata version mismatch: artifact=${artifact.version}, metadata=${artifact.metadata.artifactVersion}`
    )
  }

  const stepCount = lessons.reduce((total, lesson) => total + lesson.steps.length, 0)
  const snippetCount = stepCount * 2

  if (artifact.lessonCount !== lessons.length) {
    throw new Error(
      `Tour v4 artifact lesson count mismatch: expected ${lessons.length}, received ${artifact.lessonCount}`
    )
  }

  if (artifact.stepCount !== stepCount) {
    throw new Error(`Tour v4 artifact step count mismatch: expected ${stepCount}, received ${artifact.stepCount}`)
  }

  if (artifact.snippetCount !== snippetCount) {
    throw new Error(
      `Tour v4 artifact snippet count mismatch: expected ${snippetCount}, received ${artifact.snippetCount}`
    )
  }

  const stepMap = indexTourMigrationArtifact(artifact)
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      const key = buildTourArtifactStepKey(lesson.slug, step.orderIndex)
      if (!stepMap.has(key)) {
        throw new Error(`Tour v4 artifact is missing ${lesson.slug} step ${step.orderIndex}`)
      }
    }
  }

  return stepMap
}
