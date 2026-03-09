#!/usr/bin/env bun

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { runTourV4Qa } from "@/lib/tourV4Qa"

interface ParsedArgs {
  readonly seedPath: string
  readonly artifactPath?: string
  readonly toolRoot: string
  readonly reportPath?: string
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  let seedPath = path.resolve(process.cwd(), "scripts/seed-tour.ts")
  let artifactPath: string | undefined
  let toolRoot = path.resolve(process.cwd(), "..", "effect-refactoring-tool")
  let reportPath: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    switch (arg) {
      case "--seed":
        seedPath = path.resolve(argv[index + 1] ?? seedPath)
        index += 1
        break
      case "--artifact":
        artifactPath = path.resolve(argv[index + 1] ?? "")
        index += 1
        break
      case "--tool-root":
        toolRoot = path.resolve(argv[index + 1] ?? toolRoot)
        index += 1
        break
      case "--report":
        reportPath = path.resolve(argv[index + 1] ?? "")
        index += 1
        break
      case "--help":
        console.log(`tour v4 QA

Usage:
  bun run scripts/qa-tour-v4.ts [--seed /abs/path/to/scripts/seed-tour.ts] [--artifact /abs/path/to/tour-v4-snippets.json]
                                [--tool-root /abs/path/to/effect-refactoring-tool] [--report /abs/path/to/report.json]

Behavior:
  - generates a fresh artifact when --artifact is omitted
  - validates compare-mode code for every tour step
  - fails closed on invalid code, runtime divergence, or non-optimal v4 output
`)
        process.exit(0)
      default:
        break
    }
  }

  return {
    seedPath,
    artifactPath,
    toolRoot,
    reportPath,
  }
}

function createTempArtifactPath(): string {
  const tempDir = path.join(os.tmpdir(), `effect-talk-tour-v4-qa-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })
  return path.join(tempDir, "tour-v4-snippets.json")
}

function ensureToolPaths(toolRoot: string): { migrationPackageRoot: string; mappingsPath: string } {
  const migrationPackageRoot = path.join(toolRoot, "packages", "v4-migration")
  const mappingsPath = path.join(migrationPackageRoot, "v3-to-v4-migration-primitives.csv")

  if (!existsSync(migrationPackageRoot)) {
    throw new Error(`Unable to find effect-v4-migration package at ${migrationPackageRoot}`)
  }
  if (!existsSync(mappingsPath)) {
    throw new Error(`Unable to find migration mappings at ${mappingsPath}`)
  }

  return {
    migrationPackageRoot,
    mappingsPath,
  }
}

async function generateArtifactIfNeeded(
  artifactPath: string | undefined,
  migrationPackageRoot: string,
  seedPath: string
): Promise<{ artifactPath: string; temporary: boolean }> {
  if (artifactPath) {
    return { artifactPath, temporary: false }
  }

  const generatedArtifactPath = createTempArtifactPath()
  const child = Bun.spawn({
    cmd: [
      "bun",
      "run",
      "migrate-tour",
      "--",
      "--seed",
      seedPath,
      "--output",
      generatedArtifactPath,
    ],
    cwd: migrationPackageRoot,
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`Artifact generation failed with exit code ${exitCode}`)
  }

  return { artifactPath: generatedArtifactPath, temporary: true }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const { migrationPackageRoot, mappingsPath } = ensureToolPaths(args.toolRoot)
  const generated = await generateArtifactIfNeeded(args.artifactPath, migrationPackageRoot, args.seedPath)

  try {
    const report = await runTourV4Qa({
      projectRoot: process.cwd(),
      seedPath: args.seedPath,
      artifactPath: generated.artifactPath,
      mappingsPath,
    })

    if (args.reportPath) {
      writeFileSync(args.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
      console.log(`QA report written: ${args.reportPath}`)
    }

    console.log(
      `Tour v4 QA: ${report.summary.passed}/${report.summary.stepCount} steps passed, ${report.summary.failed} failed`
    )

    const failures = report.results.filter((result) => result.failures.length > 0)
    if (failures.length > 0) {
      for (const failure of failures.slice(0, 20)) {
        console.log(`- ${failure.stepKey} ${failure.title}`)
        for (const message of failure.failures) {
          console.log(`  ${message}`)
        }
      }
      if (failures.length > 20) {
        console.log(`... ${failures.length - 20} more failing steps omitted`)
      }
      process.exit(1)
    }
  } finally {
    if (generated.temporary) {
      rmSync(path.dirname(generated.artifactPath), { recursive: true, force: true })
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
