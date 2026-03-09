#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"

type ReleaseEnvironment = "local" | "staging" | "production"

interface ParsedArgs {
  readonly seedPath: string
  readonly toolRoot: string
  readonly environment: ReleaseEnvironment
  readonly outputDir: string
  readonly artifactPath: string
  readonly metadataPath: string
  readonly reportPath: string
  readonly apply: boolean
  readonly envFile?: string
  readonly skipDbCheck: boolean
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, "utf8")
  const out: Record<string, string> = {}

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }
    const eq = trimmed.indexOf("=")
    if (eq === -1) {
      continue
    }

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }

  return out
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const environmentDefault: ReleaseEnvironment = "local"
  let seedPath = path.resolve(process.cwd(), "scripts/seed-tour.ts")
  let toolRoot = path.resolve(process.cwd(), "..", "effect-refactoring-tool")
  let environment: ReleaseEnvironment = environmentDefault
  let outputDir = path.resolve(process.cwd(), ".generated", "tour-v4-release", environment)
  let artifactPath = path.join(outputDir, "tour-v4-snippets.json")
  let metadataPath = path.join(outputDir, "tour-v4-metadata.json")
  let reportPath = path.join(outputDir, "tour-v4-qa.json")
  let apply = false
  let envFile: string | undefined
  let skipDbCheck = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    switch (arg) {
      case "--seed":
        seedPath = path.resolve(argv[index + 1] ?? seedPath)
        index += 1
        break
      case "--tool-root":
        toolRoot = path.resolve(argv[index + 1] ?? toolRoot)
        index += 1
        break
      case "--environment": {
        const value = (argv[index + 1] ?? "").trim()
        if (value === "local" || value === "staging" || value === "production") {
          environment = value
        } else {
          throw new Error(`Invalid --environment value: ${value || "<empty>"}`)
        }
        outputDir = path.resolve(process.cwd(), ".generated", "tour-v4-release", environment)
        artifactPath = path.join(outputDir, "tour-v4-snippets.json")
        metadataPath = path.join(outputDir, "tour-v4-metadata.json")
        reportPath = path.join(outputDir, "tour-v4-qa.json")
        index += 1
        break
      }
      case "--output-dir":
        outputDir = path.resolve(argv[index + 1] ?? outputDir)
        artifactPath = path.join(outputDir, "tour-v4-snippets.json")
        metadataPath = path.join(outputDir, "tour-v4-metadata.json")
        reportPath = path.join(outputDir, "tour-v4-qa.json")
        index += 1
        break
      case "--artifact-out":
        artifactPath = path.resolve(argv[index + 1] ?? artifactPath)
        index += 1
        break
      case "--metadata-out":
        metadataPath = path.resolve(argv[index + 1] ?? metadataPath)
        index += 1
        break
      case "--report-out":
        reportPath = path.resolve(argv[index + 1] ?? reportPath)
        index += 1
        break
      case "--apply":
        apply = true
        break
      case "--env-file":
        envFile = path.resolve(argv[index + 1] ?? "")
        index += 1
        break
      case "--skip-db-check":
        skipDbCheck = true
        break
      case "--help":
        console.log(`prepare tour v4 release

Usage:
  bun run scripts/prepare-tour-v4-release.ts [--environment local|staging|production]
    [--seed /abs/path/to/scripts/seed-tour.ts]
    [--tool-root /abs/path/to/effect-refactoring-tool]
    [--output-dir /abs/path/to/output]
    [--artifact-out /abs/path/to/tour-v4-snippets.json]
    [--metadata-out /abs/path/to/tour-v4-metadata.json]
    [--report-out /abs/path/to/tour-v4-qa.json]
    [--apply] [--env-file /abs/path/to/env-file] [--skip-db-check]

Behavior:
  - always regenerates the artifact with the current migration tool
  - runs bun run qa:tour:v4 against that exact artifact
  - writes the artifact and report to a stable output directory
  - only seeds/promotes the database when --apply is passed
  - requires --env-file for non-local --apply runs
`)
        process.exit(0)
      default:
        break
    }
  }

  return {
    seedPath,
    toolRoot,
    environment,
    outputDir,
    artifactPath,
    metadataPath,
    reportPath,
    apply,
    envFile,
    skipDbCheck,
  }
}

function ensurePaths(args: ParsedArgs): void {
  const migrationPackageRoot = path.join(args.toolRoot, "packages", "v4-migration")
  if (!existsSync(migrationPackageRoot)) {
    throw new Error(`Unable to find effect-v4-migration package at ${migrationPackageRoot}`)
  }
  if (args.apply && args.environment !== "local" && !args.envFile) {
    throw new Error(`--env-file is required when using --apply for ${args.environment}`)
  }
}

function mergeEnv(extra?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {}

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value
    }
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      env[key] = value
    }
  }

  return env
}

async function runCommand(
  cmd: string[],
  options: {
    readonly cwd: string
    readonly env?: Record<string, string>
  }
): Promise<void> {
  const child = Bun.spawn({
    cmd,
    cwd: options.cwd,
    env: options.env,
    stdout: "inherit",
    stderr: "inherit",
  })

  const exitCode = await child.exited
  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}: ${cmd.join(" ")}`)
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  ensurePaths(args)
  mkdirSync(args.outputDir, { recursive: true })

  const migrationPackageRoot = path.join(args.toolRoot, "packages", "v4-migration")

  await runCommand(
    [
      "bun",
      "run",
      "--filter",
      "effect-v4-migration",
      "migrate-tour",
      "--",
      "--seed",
      args.seedPath,
      "--output",
      args.artifactPath,
      "--metadata-out",
      args.metadataPath,
    ],
    { cwd: args.toolRoot }
  )

  await runCommand(
    [
      "bun",
      "run",
      "qa:tour:v4",
      "--",
      "--artifact",
      args.artifactPath,
      "--metadata",
      args.metadataPath,
      "--tool-root",
      args.toolRoot,
      "--report",
      args.reportPath,
    ],
    { cwd: process.cwd() }
  )

  console.log(`Tour release artifact: ${args.artifactPath}`)
  console.log(`Tour release metadata: ${args.metadataPath}`)
  console.log(`Tour release QA report: ${args.reportPath}`)

  if (!args.apply) {
    console.log("QA passed. Database mutation was skipped because --apply was not provided.")
    return
  }

  const env = mergeEnv(args.envFile ? parseEnvFile(args.envFile) : undefined)
  env.TOUR_V4_ARTIFACT_PATH = args.artifactPath

  await runCommand(["bun", "run", "db:seed:tour"], { cwd: process.cwd(), env })
  await runCommand(["bun", "run", "db:promote", "tour"], { cwd: process.cwd(), env })
  if (!args.skipDbCheck) {
    await runCommand(["bun", "run", "db:check"], { cwd: process.cwd(), env })
  }

  console.log(`Tour release apply completed for ${args.environment}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
