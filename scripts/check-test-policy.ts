#!/usr/bin/env bun
/**
 * Test policy checker — enforces the no-behavioral-mocks rule.
 *
 * Scans test files for disallowed patterns and exits non-zero if
 * any violations are found.
 *
 * Usage:
 *   bun run scripts/check-test-policy.ts
 *   bun run test:policy
 *
 * See docs/TESTING_STRATEGY.md § "Structural Exceptions".
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const SRC = join(ROOT, "src")

// ── Patterns that are ALWAYS forbidden in test files ────────
const GLOBAL_FORBIDDEN: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /vi\.spyOn\s*\(/, label: "vi.spyOn(" },
  { pattern: /\.toHaveBeenCalled\b/, label: ".toHaveBeenCalled" },
  { pattern: /\.toHaveBeenCalledWith\b/, label: ".toHaveBeenCalledWith" },
  { pattern: /jest\.mock\s*\(/, label: "jest.mock(" },
  { pattern: /jest\.spyOn\s*\(/, label: "jest.spyOn(" },
  { pattern: /\.mockImplementation\s*\(/, label: ".mockImplementation(" },
  { pattern: /\.mockReturnValue\s*\(/, label: ".mockReturnValue(" },
  { pattern: /\.mockResolvedValue\s*\(/, label: ".mockResolvedValue(" },
  { pattern: /\.mockRejectedValue\s*\(/, label: ".mockRejectedValue(" },
]

// ── Patterns forbidden ONLY in service test directories ─────
const SERVICE_FORBIDDEN: readonly {
  pattern: RegExp
  label: string
}[] = [
  { pattern: /vi\.fn\s*\(/, label: "vi.fn(" },
]

// ── Helpers ─────────────────────────────────────────────────

function isTestFile(path: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx|mts|cts)$/.test(path)
}

function isServiceTestPath(relPath: string): boolean {
  return (
    relPath.startsWith("src/services/") &&
    relPath.includes("__tests__")
  )
}

function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue
      results.push(...collectFiles(full))
    } else if (isTestFile(full)) {
      results.push(full)
    }
  }
  return results
}

interface Violation {
  file: string
  line: number
  label: string
  text: string
}

function scanFile(
  absPath: string,
  relPath: string,
): Violation[] {
  const content = readFileSync(absPath, "utf-8")
  const lines = content.split("\n")
  const violations: Violation[] = []
  const inServiceDir = isServiceTestPath(relPath)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip comment lines (both // and block comments)
    const trimmed = line.trimStart()
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
      continue
    }

    for (const rule of GLOBAL_FORBIDDEN) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relPath,
          line: i + 1,
          label: rule.label,
          text: line.trim(),
        })
      }
    }

    if (inServiceDir) {
      for (const rule of SERVICE_FORBIDDEN) {
        if (rule.pattern.test(line)) {
          violations.push({
            file: relPath,
            line: i + 1,
            label: rule.label,
            text: line.trim(),
          })
        }
      }
    }
  }

  return violations
}

// ── Coverage exclusion lint ──────────────────────────────────
// Prevents wildcard regressions in vitest.config.mts coverage
// exclude list. Only explicit paths are allowed for services.

function checkCoverageExclusions(): string[] {
  const configPath = join(ROOT, "vitest.config.mts")
  const content = readFileSync(configPath, "utf-8")
  const errors: string[] = []

  // Forbidden: service-directory wildcards in coverage exclude
  const wildcardPatterns = [
    /["']src\/services\/\*\//,
    /["']\*\*\/services\/\*\*/,
    /["']src\/services\/\*["']/,
  ]
  const lines = content.split("\n")
  for (let i = 0; i < lines.length; i++) {
    for (const wp of wildcardPatterns) {
      if (wp.test(lines[i])) {
        errors.push(
          `vitest.config.mts:${i + 1}  Service coverage exclusion must use explicit paths, not wildcards\n    ${lines[i].trim()}\n    See docs/TESTING_STRATEGY.md § "Coverage Exclusions"`
        )
      }
    }
  }
  return errors
}

// ── Main ────────────────────────────────────────────────────

const files = collectFiles(SRC)
const allViolations: Violation[] = []

for (const f of files) {
  const rel = relative(ROOT, f)
  allViolations.push(...scanFile(f, rel))
}

const exclusionErrors = checkCoverageExclusions()

if (allViolations.length === 0 && exclusionErrors.length === 0) {
  console.log(
    `✓ Test policy check passed (${files.length} files scanned)`
  )
  process.exit(0)
}

if (allViolations.length > 0) {
  console.error(
    `✗ Test policy: ${allViolations.length} mock violation(s) in ` +
      `${new Set(allViolations.map((v) => v.file)).size} file(s):\n`
  )
  for (const v of allViolations) {
    console.error(`  ${v.file}:${v.line}  ${v.label}`)
    console.error(`    ${v.text}\n`)
  }
  console.error(
    "See docs/TESTING_STRATEGY.md § 'Structural Exceptions' " +
      "for allowed patterns.\n"
  )
}

if (exclusionErrors.length > 0) {
  console.error(
    `✗ Coverage exclusion lint: ${exclusionErrors.length} wildcard(s) found:\n`
  )
  for (const e of exclusionErrors) {
    console.error(`  ${e}\n`)
  }
}

process.exit(1)
