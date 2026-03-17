#!/usr/bin/env bun

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { runTourV4Qa } from "@/lib/tourV4Qa";

interface ParsedArgs {
  readonly artifactPath?: string;
  readonly manifestPath: string;
  readonly metadataPath?: string;
  readonly reportPath?: string;
  readonly toolRoot: string;
  readonly v3DocsRoot: string;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let manifestPath = path.resolve(
    process.cwd(),
    "content",
    "tour",
    "tour-manifest.json"
  );
  let v3DocsRoot = path.resolve(process.cwd(), "content", "tour-docs", "v3");
  let artifactPath: string | undefined;
  let metadataPath: string | undefined;
  let toolRoot = path.resolve(process.cwd(), "..", "effect-refactoring-tool");
  let reportPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--manifest":
        manifestPath = path.resolve(argv[index + 1] ?? manifestPath);
        index += 1;
        break;
      case "--v3-docs-root":
        v3DocsRoot = path.resolve(argv[index + 1] ?? v3DocsRoot);
        index += 1;
        break;
      case "--artifact":
        artifactPath = path.resolve(argv[index + 1] ?? "");
        index += 1;
        break;
      case "--metadata":
        metadataPath = path.resolve(argv[index + 1] ?? "");
        index += 1;
        break;
      case "--tool-root":
        toolRoot = path.resolve(argv[index + 1] ?? toolRoot);
        index += 1;
        break;
      case "--report":
        reportPath = path.resolve(argv[index + 1] ?? "");
        index += 1;
        break;
      case "--help":
        console.log(`tour v4 QA

Usage:
  bun run scripts/qa-tour-v4.ts [--manifest /abs/path/to/content/tour/tour-manifest.json]
                                [--v3-docs-root /abs/path/to/content/tour-docs/v3]
                                [--artifact /abs/path/to/tour-v4-snippets.json]
                                [--metadata /abs/path/to/tour-v4-metadata.json]
                                [--tool-root /abs/path/to/effect-refactoring-tool] [--report /abs/path/to/report.json]

Behavior:
  - generates a fresh artifact when --artifact is omitted
  - validates compare-mode code for every tour step
  - fails closed on invalid code, runtime divergence, or non-optimal v4 output
`);
        process.exit(0);
        return {
          manifestPath,
          v3DocsRoot,
          artifactPath,
          metadataPath,
          toolRoot,
          reportPath,
        };
      default:
        break;
    }
  }

  return {
    manifestPath,
    v3DocsRoot,
    artifactPath,
    metadataPath,
    toolRoot,
    reportPath,
  };
}

function createTempArtifactPath(): string {
  const tempDir = path.join(
    os.tmpdir(),
    `effect-talk-tour-v4-qa-${Date.now()}`
  );
  mkdirSync(tempDir, { recursive: true });
  return path.join(tempDir, "tour-v4-snippets.json");
}

function buildTempMetadataPath(artifactPath: string): string {
  return path.join(path.dirname(artifactPath), "tour-v4-metadata.json");
}

function ensureToolPaths(toolRoot: string): { migrationPackageRoot: string } {
  const migrationPackageRoot = path.join(toolRoot, "packages", "v4-migration");

  if (!existsSync(migrationPackageRoot)) {
    throw new Error(
      `Unable to find effect-v4-migration package at ${migrationPackageRoot}`
    );
  }

  return {
    migrationPackageRoot,
  };
}

async function generateArtifactIfNeeded(
  artifactPath: string | undefined,
  metadataPath: string | undefined,
  migrationPackageRoot: string,
  manifestPath: string,
  v3DocsRoot: string
): Promise<{
  artifactPath: string;
  metadataPath?: string;
  temporary: boolean;
}> {
  if (artifactPath) {
    return { artifactPath, metadataPath, temporary: false };
  }

  const generatedArtifactPath = createTempArtifactPath();
  const generatedMetadataPath = buildTempMetadataPath(generatedArtifactPath);
  const child = Bun.spawn({
    cmd: [
      "bun",
      "run",
      "migrate-tour",
      "--",
      "--manifest",
      manifestPath,
      "--v3-docs-root",
      v3DocsRoot,
      "--output",
      generatedArtifactPath,
      "--transform-profile",
      "pilot-structural",
      "--metadata-out",
      generatedMetadataPath,
    ],
    cwd: migrationPackageRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`Artifact generation failed with exit code ${exitCode}`);
  }

  return {
    artifactPath: generatedArtifactPath,
    metadataPath: generatedMetadataPath,
    temporary: true,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { migrationPackageRoot } = ensureToolPaths(args.toolRoot);
  const generated = await generateArtifactIfNeeded(
    args.artifactPath,
    args.metadataPath,
    migrationPackageRoot,
    args.manifestPath,
    args.v3DocsRoot
  );

  try {
    const report = await runTourV4Qa({
      projectRoot: process.cwd(),
      manifestPath: args.manifestPath,
      artifactPath: generated.artifactPath,
      metadataPath: generated.metadataPath,
    });

    if (args.reportPath) {
      writeFileSync(
        args.reportPath,
        `${JSON.stringify(report, null, 2)}\n`,
        "utf8"
      );
      console.log(`QA report written: ${args.reportPath}`);
    }

    console.log(
      `Tour v4 QA: ${report.summary.passed}/${report.summary.stepCount} steps passed, ${report.summary.failed} failed`
    );
    console.log(
      `Trust states: unchanged=${report.summary.unchangedCount} auto-certified=${report.summary.autoCertifiedCount} review-needed=${report.summary.reviewNeededCount}`
    );

    const failures = report.results.filter(
      (result) => result.failures.length > 0
    );
    if (failures.length > 0) {
      for (const failure of failures.slice(0, 20)) {
        console.log(`- ${failure.stepKey} ${failure.title}`);
        for (const message of failure.failures) {
          console.log(`  ${message}`);
        }
      }
      if (failures.length > 20) {
        console.log(`... ${failures.length - 20} more failing steps omitted`);
      }
      process.exit(1);
    }
  } finally {
    if (generated.temporary) {
      rmSync(path.dirname(generated.artifactPath), {
        recursive: true,
        force: true,
      });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
