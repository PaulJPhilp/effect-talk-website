#!/usr/bin/env bun

/**
 * Seed script: loads the docs-derived tour manifest and migrated v4 snippets into
 * STAGING tables. This script is intentionally not the authored source of truth.
 *
 * Usage:
 *   TOUR_V4_ARTIFACT_PATH=/abs/path/to/tour-v4-snippets.json bun run scripts/seed-tour.ts
 *
 * Optional:
 *   TOUR_MANIFEST_PATH=/abs/path/to/content/tour/tour-manifest.json
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  contentDeployments,
  patterns,
  tourLessonsStaging,
  tourStepsStaging,
} from "../src/db/schema";
import { loadTourManifest } from "../src/lib/tourManifest";
import {
  buildTourArtifactStepKey,
  type TourMigrationArtifact,
  validateTourMigrationArtifact,
} from "../src/lib/tourMigrationArtifact";
import { lessonId, stepId } from "./lib/deterministic-ids";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(rootDir, "..", ".env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const db = drizzle(databaseUrl);

type PatternCache = Map<string, string>;

let patternCache: PatternCache | null = null;

function hasMissingPatternsTableError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      cause?: unknown;
    };
    if (candidate.code === "42P01") {
      return true;
    }
    if (
      typeof candidate.message === "string" &&
      candidate.message.includes("effect_patterns")
    ) {
      return true;
    }
    if (candidate.cause) {
      return hasMissingPatternsTableError(candidate.cause);
    }
  }
  if (typeof error === "string" && error.includes("effect_patterns")) {
    return true;
  }
  return false;
}

async function buildPatternCache() {
  try {
    const allPatterns = await db
      .select({ id: patterns.id, title: patterns.title })
      .from(patterns);
    patternCache = new Map(
      allPatterns.map((pattern) => [pattern.title, pattern.id])
    );
    console.log(`Loaded ${patternCache.size} patterns for linking`);
  } catch (error) {
    if (!hasMissingPatternsTableError(error)) {
      throw error;
    }
    patternCache = new Map();
    console.warn(
      'Shared "effect_patterns" table is unavailable in this database; staging tour steps without pattern links.'
    );
  }
}

function resolvePatternId(patternTitle: string | null): string | null {
  if (!(patternTitle && patternCache)) {
    return null;
  }
  const id = patternCache.get(patternTitle);
  if (!id) {
    console.warn(`  ⚠ Pattern not found: "${patternTitle}"`);
  }
  return id ?? null;
}

function loadTourV4Artifact(filePath: string): TourMigrationArtifact {
  return JSON.parse(readFileSync(filePath, "utf8")) as TourMigrationArtifact;
}

async function seed(): Promise<void> {
  const artifactPath = process.env.TOUR_V4_ARTIFACT_PATH;
  if (!artifactPath) {
    throw new Error(
      "Missing TOUR_V4_ARTIFACT_PATH. Generate the docs-derived tour artifact first."
    );
  }

  const manifestPath = path.resolve(
    process.env.TOUR_MANIFEST_PATH ??
      path.join(rootDir, "..", "content", "tour", "tour-manifest.json")
  );
  const manifest = loadTourManifest(manifestPath);
  const artifact = loadTourV4Artifact(artifactPath);
  const stepMap = validateTourMigrationArtifact(artifact, manifest);

  console.log("Clearing staging tables...");
  await db.delete(tourStepsStaging);
  await db.delete(tourLessonsStaging);

  await buildPatternCache();

  let totalSteps = 0;

  for (const lesson of manifest.lessons) {
    const deterministicLessonId = lessonId(lesson.slug);
    console.log(
      `\nStaging Lesson ${lesson.orderIndex}: ${lesson.title} (id: ${deterministicLessonId.slice(0, 8)}...)`
    );

    await db.insert(tourLessonsStaging).values({
      id: deterministicLessonId,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description,
      orderIndex: lesson.orderIndex,
      group: lesson.group,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
    });

    for (const step of lesson.steps) {
      const artifactStep = stepMap.get(
        buildTourArtifactStepKey(lesson.slug, step.orderIndex)
      );
      if (!artifactStep) {
        throw new Error(
          `Tour artifact is missing ${lesson.slug} step ${step.orderIndex}`
        );
      }

      await db.insert(tourStepsStaging).values({
        id: stepId(lesson.slug, step.orderIndex),
        lessonId: deterministicLessonId,
        orderIndex: step.orderIndex,
        title: step.title,
        instruction: step.instruction,
        conceptCode: artifactStep.conceptCode,
        conceptCodeV4: artifactStep.migratedConceptCode,
        conceptCodeLanguage: step.conceptCodeLanguage,
        solutionCode: artifactStep.solutionCode,
        solutionCodeV4: artifactStep.migratedSolutionCode,
        playgroundUrl: step.playgroundUrl,
        hints: [...step.hints],
        feedbackOnComplete: step.feedbackOnComplete,
        patternId: resolvePatternId(step.patternTitle),
      });
    }

    totalSteps += lesson.steps.length;
    console.log(`  → ${lesson.steps.length} steps staged`);
  }

  await db.insert(contentDeployments).values({
    tableGroup: "tour",
    status: "staged",
    rowCount: manifest.lessons.length + totalSteps,
    metadata: {
      lessons: manifest.lessons.length,
      steps: totalSteps,
      manifestPath,
      v4ArtifactPath: artifactPath,
      sourceTitle: manifest.title,
    },
  });

  console.log(
    `\nStaging complete! ${manifest.lessons.length} lessons, ${totalSteps} steps.`
  );
  console.log("To promote to live, run:");
  console.log("  bun run db:promote tour");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
