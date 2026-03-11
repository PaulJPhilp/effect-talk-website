import { countTourManifestSnippets, countTourManifestSteps, indexTourManifest, type TourManifest } from "@/lib/tourManifest"

export const SUPPORTED_TOUR_ARTIFACT_VERSION = 3
export const SUPPORTED_TOUR_METADATA_VERSION = 1
export const REQUIRED_TOUR_TRANSFORM_PROFILE = "pilot-structural"
export type TourMigrationStatus = "unchanged" | "auto-certified" | "review-needed"

export interface PrimitiveMigrationReport {
  readonly id: string
  readonly original: string
  readonly migrated?: string
  readonly migrationKind: "unchanged" | "direct" | "structural" | "review-needed"
  readonly status: "unchanged" | "migrated" | "review-needed"
}

export interface SnippetMigrationReport {
  readonly snippetId: string
  readonly originalCode: string
  readonly primitives: readonly PrimitiveMigrationReport[]
  readonly resultCode: string
  readonly snippetStatus: TourMigrationStatus
}

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
  readonly instruction?: string
  readonly conceptCode?: string
  readonly solutionCode?: string
  readonly conceptCodeLanguage?: string
  readonly migratedConceptCode: string
  readonly migratedSolutionCode: string
  readonly conceptChanged?: boolean
  readonly solutionChanged?: boolean
  readonly conceptHasManualReview?: boolean
  readonly solutionHasManualReview?: boolean
  readonly migrationStatus: TourMigrationStatus
  readonly expectedMigrationPolicy?: string
  readonly v4ValidationPath?: string
  readonly conceptProvenance: {
    readonly docsRef: string
    readonly filePath: string
    readonly selector: {
      readonly type: string
      readonly value: string
    }
    readonly contentHash: string
  }
  readonly solutionProvenance: {
    readonly docsRef: string
    readonly filePath: string
    readonly selector: {
      readonly type: string
      readonly value: string
    }
    readonly contentHash: string
  }
  readonly conceptDiagnostics?: readonly unknown[]
  readonly solutionDiagnostics?: readonly unknown[]
  readonly conceptMigrationReport?: SnippetMigrationReport
  readonly solutionMigrationReport?: SnippetMigrationReport
  readonly conceptMatchedPatternIds?: readonly string[]
  readonly solutionMatchedPatternIds?: readonly string[]
  readonly reviewRequiredReasonCodes?: readonly string[]
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
  readonly sourceManifestPath?: string
  readonly sourceDocsRoot?: string
  readonly transformProfile?: string
  readonly lessonCount: number
  readonly stepCount: number
  readonly snippetCount: number
  readonly generatedAt?: string
  readonly lessons: readonly TourMigrationArtifactLesson[]
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
  manifest: TourManifest
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
  if (artifact.metadata.transformProfile !== REQUIRED_TOUR_TRANSFORM_PROFILE) {
    throw new Error(
      `Unsupported tour v4 transform profile: expected ${REQUIRED_TOUR_TRANSFORM_PROFILE}, received ${artifact.metadata.transformProfile}`
    )
  }
  if (artifact.transformProfile && artifact.transformProfile !== REQUIRED_TOUR_TRANSFORM_PROFILE) {
    throw new Error(
      `Tour v4 artifact transform profile mismatch: expected ${REQUIRED_TOUR_TRANSFORM_PROFILE}, received ${artifact.transformProfile}`
    )
  }

  const stepCount = countTourManifestSteps(manifest)
  const snippetCount = countTourManifestSnippets(manifest)

  if (artifact.lessonCount !== manifest.lessons.length) {
    throw new Error(
      `Tour v4 artifact lesson count mismatch: expected ${manifest.lessons.length}, received ${artifact.lessonCount}`
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
  const manifestStepMap = indexTourManifest(manifest)
  for (const [key, entry] of manifestStepMap) {
    const step = stepMap.get(key)
    if (!step) {
      throw new Error(`Tour v4 artifact is missing ${entry.lesson.slug} step ${entry.step.orderIndex}`)
    }
    if (step.migrationStatus !== "unchanged" && step.migrationStatus !== "auto-certified" && step.migrationStatus !== "review-needed") {
      throw new Error(`Tour v4 artifact has invalid migration status for ${key}: ${String(step.migrationStatus)}`)
    }
    if (!step.conceptProvenance?.docsRef || !step.conceptProvenance?.filePath || !step.conceptProvenance?.contentHash) {
      throw new Error(`Tour v4 artifact is missing concept provenance for ${key}`)
    }
    if (!step.solutionProvenance?.docsRef || !step.solutionProvenance?.filePath || !step.solutionProvenance?.contentHash) {
      throw new Error(`Tour v4 artifact is missing solution provenance for ${key}`)
    }
    if (step.conceptMatchedPatternIds && !Array.isArray(step.conceptMatchedPatternIds)) {
      throw new Error(`Tour v4 artifact has invalid concept matched pattern ids for ${key}`)
    }
    if (step.solutionMatchedPatternIds && !Array.isArray(step.solutionMatchedPatternIds)) {
      throw new Error(`Tour v4 artifact has invalid solution matched pattern ids for ${key}`)
    }
    if (step.reviewRequiredReasonCodes && !Array.isArray(step.reviewRequiredReasonCodes)) {
      throw new Error(`Tour v4 artifact has invalid review-required reason codes for ${key}`)
    }
    if (step.conceptMigrationReport) {
      if (!Array.isArray(step.conceptMigrationReport.primitives)) {
        throw new Error(`Tour v4 artifact has invalid concept migration report for ${key}`)
      }
      if (
        step.conceptMigrationReport.snippetStatus !== "unchanged" &&
        step.conceptMigrationReport.snippetStatus !== "auto-certified" &&
        step.conceptMigrationReport.snippetStatus !== "review-needed"
      ) {
        throw new Error(`Tour v4 artifact has invalid concept migration report status for ${key}`)
      }
    }
    if (step.solutionMigrationReport) {
      if (!Array.isArray(step.solutionMigrationReport.primitives)) {
        throw new Error(`Tour v4 artifact has invalid solution migration report for ${key}`)
      }
      if (
        step.solutionMigrationReport.snippetStatus !== "unchanged" &&
        step.solutionMigrationReport.snippetStatus !== "auto-certified" &&
        step.solutionMigrationReport.snippetStatus !== "review-needed"
      ) {
        throw new Error(`Tour v4 artifact has invalid solution migration report status for ${key}`)
      }
    }
  }

  for (const lesson of artifact.lessons) {
    for (const step of lesson.steps) {
      const key = buildTourArtifactStepKey(lesson.slug, step.orderIndex)
      if (!manifestStepMap.has(key)) {
        throw new Error(`Tour v4 artifact contains an unexpected step entry for ${lesson.slug} step ${step.orderIndex}`)
      }
      if (!stepMap.has(key)) {
        throw new Error(`Tour v4 artifact is missing ${lesson.slug} step ${step.orderIndex}`)
      }
    }
  }

  return stepMap
}
