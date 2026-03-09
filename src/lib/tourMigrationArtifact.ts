export interface TourMigrationArtifactStep {
  readonly orderIndex: number
  readonly migratedConceptCode: string
  readonly migratedSolutionCode: string
}

export interface TourMigrationArtifactLesson {
  readonly slug: string
  readonly steps: readonly TourMigrationArtifactStep[]
}

export interface TourMigrationArtifact {
  readonly lessonCount: number
  readonly stepCount: number
  readonly snippetCount: number
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
