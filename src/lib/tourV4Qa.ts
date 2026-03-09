import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import ts from "typescript"
import { EMPTY_COMPARE_CODE, getTourCompareView } from "@/lib/tourCompare"
import {
  buildTourArtifactStepKey,
  type TourMigrationArtifact,
  validateTourMigrationArtifact,
} from "@/lib/tourMigrationArtifact"
import type { TourStep } from "@/services/TourProgress/types"

const MANUAL_MARKER_PATTERNS = [
  "TODO: EFFECT-MIGRATION-MANUAL",
  "Something went wrong",
  'throw new Error("TODO: EFFECT-MIGRATION-MANUAL',
] as const

const COMPARE_SUMMARY_IDENTICAL = "No API-level migration changes were needed for this step."
const COMPARE_SUMMARY_CHANGED = "This step is showing the generated v4 lesson variant alongside the current v3 version."

export interface TourQaStep {
  readonly slug: string
  readonly lessonTitle: string
  readonly orderIndex: number
  readonly title: string
  readonly conceptCode: string | null
  readonly solutionCode: string | null
  readonly conceptCodeLanguage: string | null
}

export interface TourQaLesson {
  readonly slug: string
  readonly title: string
  readonly steps: readonly TourQaStep[]
}

export interface MigrationMapping {
  readonly v3Api: string
  readonly v4Api: string
  readonly mappingType: string
}

export interface SnippetExecutionResult {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
  readonly timedOut: boolean
}

export interface SnippetQaResult {
  readonly typecheckErrors: readonly string[]
  readonly execution: SnippetExecutionResult
}

export interface TourStepQaResult {
  readonly stepKey: string
  readonly slug: string
  readonly lessonTitle: string
  readonly orderIndex: number
  readonly title: string
  readonly identical: boolean
  readonly failures: readonly string[]
  readonly v3: SnippetQaResult
  readonly v4: SnippetQaResult
}

export interface TourQaSummary {
  readonly stepCount: number
  readonly passed: number
  readonly failed: number
}

export interface TourQaReport {
  readonly artifactPath: string
  readonly seedPath: string
  readonly generatedAt: string
  readonly summary: TourQaSummary
  readonly results: readonly TourStepQaResult[]
}

const EMPTY_EXECUTION_RESULT: SnippetExecutionResult = {
  exitCode: 0,
  stdout: "",
  stderr: "",
  timedOut: false,
}

type LessonStepsByName = ReadonlyMap<string, readonly TourQaStep[]>

const normalizeText = (value: string): string => value.replace(/\r\n/g, "\n").trim()

const normalizeCsvRow = (line: string): readonly string[] => line.split("\t")

const getObjectLiteralProperty = (
  objectLiteral: ts.ObjectLiteralExpression,
  name: string
): ts.PropertyAssignment | undefined =>
  objectLiteral.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === name) ||
        (ts.isStringLiteral(property.name) && property.name.text === name))
  )

const expectStringLiteral = (
  objectLiteral: ts.ObjectLiteralExpression,
  name: string,
  sourceFile: ts.SourceFile
): string => {
  const property = getObjectLiteralProperty(objectLiteral, name)
  if (!property) {
    throw new Error(`Missing required string property "${name}" in ${sourceFile.fileName}`)
  }
  if (!ts.isStringLiteralLike(property.initializer) && !ts.isNoSubstitutionTemplateLiteral(property.initializer)) {
    throw new Error(`Property "${name}" must be a string literal in ${sourceFile.fileName}`)
  }
  return property.initializer.text
}

const expectNumberLiteral = (
  objectLiteral: ts.ObjectLiteralExpression,
  name: string,
  sourceFile: ts.SourceFile
): number => {
  const property = getObjectLiteralProperty(objectLiteral, name)
  if (!property || !ts.isNumericLiteral(property.initializer)) {
    throw new Error(`Property "${name}" must be a numeric literal in ${sourceFile.fileName}`)
  }
  return Number(property.initializer.text)
}

const optionalStringLiteral = (
  objectLiteral: ts.ObjectLiteralExpression,
  name: string,
  sourceFile: ts.SourceFile
): string | null => {
  const property = getObjectLiteralProperty(objectLiteral, name)
  if (!property) {
    return null
  }
  if (property.initializer.kind === ts.SyntaxKind.NullKeyword) {
    return null
  }
  if (!ts.isStringLiteralLike(property.initializer) && !ts.isNoSubstitutionTemplateLiteral(property.initializer)) {
    throw new Error(`Property "${name}" must be a string literal or null in ${sourceFile.fileName}`)
  }
  return property.initializer.text
}

const expectIdentifierReference = (
  objectLiteral: ts.ObjectLiteralExpression,
  name: string,
  sourceFile: ts.SourceFile
): string => {
  const property = getObjectLiteralProperty(objectLiteral, name)
  if (!property || !ts.isIdentifier(property.initializer)) {
    throw new Error(`Property "${name}" must be an identifier reference in ${sourceFile.fileName}`)
  }
  return property.initializer.text
}

function collectVariableArrayInitializers(sourceFile: ts.SourceFile): ReadonlyMap<string, ts.ArrayLiteralExpression> {
  const arrays = new Map<string, ts.ArrayLiteralExpression>()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        continue
      }
      arrays.set(declaration.name.text, declaration.initializer)
    }
  }

  return arrays
}

export function extractTourLessonsFromSeedSource(sourceText: string, filePath: string): readonly TourQaLesson[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const arrays = collectVariableArrayInitializers(sourceFile)
  const allLessons = arrays.get("allLessons")

  if (!allLessons) {
    throw new Error(`Unable to find allLessons array in ${filePath}`)
  }

  return allLessons.elements.map((lessonNode) => {
    if (!ts.isObjectLiteralExpression(lessonNode)) {
      throw new Error(`Lesson entry must be an object literal in ${filePath}`)
    }

    const slug = expectStringLiteral(lessonNode, "slug", sourceFile)
    const title = expectStringLiteral(lessonNode, "title", sourceFile)
    const stepArrayName = expectIdentifierReference(lessonNode, "steps", sourceFile)
    const stepArray = arrays.get(stepArrayName)
    if (!stepArray) {
      throw new Error(`Unable to resolve steps array "${stepArrayName}" for lesson ${slug}`)
    }

    const steps = stepArray.elements.map((stepNode) => {
      if (!ts.isObjectLiteralExpression(stepNode)) {
        throw new Error(`Step entry for lesson ${slug} must be an object literal in ${filePath}`)
      }

      return {
        slug,
        lessonTitle: title,
        orderIndex: expectNumberLiteral(stepNode, "orderIndex", sourceFile),
        title: expectStringLiteral(stepNode, "title", sourceFile),
        conceptCode: optionalStringLiteral(stepNode, "conceptCode", sourceFile),
        solutionCode: optionalStringLiteral(stepNode, "solutionCode", sourceFile),
        conceptCodeLanguage: optionalStringLiteral(stepNode, "conceptCodeLanguage", sourceFile),
      } satisfies TourQaStep
    })

    return {
      slug,
      title,
      steps,
    } satisfies TourQaLesson
  })
}

export function extractTourLessonsFromSeedFile(seedPath: string): readonly TourQaLesson[] {
  return extractTourLessonsFromSeedSource(readFileSync(seedPath, "utf8"), seedPath)
}

export function loadTourMigrationArtifact(filePath: string): TourMigrationArtifact {
  return JSON.parse(readFileSync(filePath, "utf8")) as TourMigrationArtifact
}

export function loadMigrationMappings(filePath: string): readonly MigrationMapping[] {
  const lines = readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return []
  }

  const headers = normalizeCsvRow(lines[0]).map((header) => header.trim().toLowerCase())
  const v3ApiIndex = headers.indexOf("v3 api")
  const v4ApiIndex = headers.indexOf("v4 api")
  const mappingTypeIndex = headers.indexOf("mapping type")

  return lines.slice(1).map((line) => {
    const cells = normalizeCsvRow(line)
    return {
      v3Api: (cells[v3ApiIndex] ?? "").trim(),
      v4Api: (cells[v4ApiIndex] ?? "").trim(),
      mappingType: (cells[mappingTypeIndex] ?? "").trim(),
    } satisfies MigrationMapping
  })
}

function buildLessonStepsByName(lessons: readonly TourQaLesson[]): LessonStepsByName {
  return new Map(lessons.map((lesson) => [lesson.slug, lesson.steps]))
}

function buildTourStep(step: TourQaStep, artifactStep: TourMigrationArtifact["lessons"][number]["steps"][number]): TourStep {
  return {
    id: `${step.slug}:${step.orderIndex}`,
    lesson_id: step.slug,
    order_index: step.orderIndex,
    title: step.title,
    instruction: "",
    concept_code: step.conceptCode,
    concept_code_v4: artifactStep.migratedConceptCode,
    concept_code_language: step.conceptCodeLanguage,
    solution_code: step.solutionCode,
    solution_code_v4: artifactStep.migratedSolutionCode,
    playground_url: null,
    hints: null,
    feedback_on_complete: null,
    pattern_id: null,
    created_at: "1970-01-01T00:00:00.000Z",
  }
}

function createCompilerOptions(projectRoot: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json")
  if (!configPath) {
    throw new Error(`Unable to find tsconfig.json from ${projectRoot}`)
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"))
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))
  return {
    ...parsed.options,
    incremental: false,
    noEmit: true,
  }
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
  if (!diagnostic.file || typeof diagnostic.start !== "number") {
    return message
  }
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${message}`
}

function typecheckSnippet(projectRoot: string, tempDir: string, label: string, code: string): readonly string[] {
  const filePath = path.join(tempDir, `${label}.ts`)
  writeFileSync(filePath, `${code}\n`, "utf8")

  const compilerOptions = createCompilerOptions(projectRoot)
  const program = ts.createProgram([filePath], compilerOptions)
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)

  return diagnostics.map(formatDiagnostic)
}

function buildRuntimeHarness(modulePath: string): string {
  return `const originalSetTimeout = globalThis.setTimeout.bind(globalThis)
const originalSetInterval = globalThis.setInterval.bind(globalThis)
const originalClearTimeout = globalThis.clearTimeout.bind(globalThis)
const originalClearInterval = globalThis.clearInterval.bind(globalThis)
const originalRandom = Math.random.bind(Math)
const originalFetch = globalThis.fetch?.bind(globalThis)

globalThis.setTimeout = ((handler, _delay, ...args) =>
  originalSetTimeout(handler, 0, ...args))
globalThis.setInterval = ((handler, _delay, ...args) =>
  originalSetInterval(handler, 0, ...args))
globalThis.clearTimeout = (value) => originalClearTimeout(value)
globalThis.clearInterval = (value) => originalClearInterval(value)
Math.random = () => 0.1
globalThis.fetch = (async (input) => {
  const url = typeof input === "string" ? input : String(input)
  const body = url.includes("/api/users/")
    ? { id: 1, name: "Alice" }
    : { ok: true, url }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
})

try {
  await import(${JSON.stringify(modulePath)})
  await new Promise((resolve) => originalSetTimeout(resolve, 50))
} finally {
  Math.random = originalRandom
  if (originalFetch) {
    globalThis.fetch = originalFetch
  }
}
`
}

async function executeSnippet(
  tempDir: string,
  label: string,
  code: string
): Promise<SnippetExecutionResult> {
  const subjectPath = path.join(tempDir, `${label}.ts`)
  const runnerPath = path.join(tempDir, `${label}.runner.mjs`)
  writeFileSync(subjectPath, `${code}\n`, "utf8")
  writeFileSync(runnerPath, buildRuntimeHarness(`./${path.basename(subjectPath)}`), "utf8")

  const child = Bun.spawn({
    cmd: ["bun", runnerPath],
    cwd: tempDir,
    stdout: "pipe",
    stderr: "pipe",
  })

  const timeoutId = setTimeout(() => {
    child.kill()
  }, 5_000)

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  clearTimeout(timeoutId)

  return {
    exitCode,
    stdout: normalizeText(stdout),
    stderr: normalizeText(stderr),
    timedOut: child.signalCode !== null,
  }
}

function collectQualifiedUsages(code: string): ReadonlySet<string> {
  const sourceFile = ts.createSourceFile("snippet.ts", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const usages = new Set<string>()

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      usages.add(node.getText(sourceFile))
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      usages.add(node.expression.getText(sourceFile))
    }
    if (ts.isQualifiedName(node)) {
      usages.add(node.getText(sourceFile))
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return usages
}

function collectOptimalityFailures(code: string, mappings: readonly MigrationMapping[]): readonly string[] {
  const failures: string[] = []

  for (const pattern of MANUAL_MARKER_PATTERNS) {
    if (code.includes(pattern)) {
      failures.push(`contains migration placeholder: ${pattern}`)
    }
  }

  const usages = collectQualifiedUsages(code)
  const blockedApis = mappings.filter(
    (mapping) =>
      mapping.v3Api.length > 0 &&
      mapping.v3Api !== mapping.v4Api &&
      mapping.mappingType.toLowerCase() !== "[1:1 direct]"
  )

  for (const mapping of blockedApis) {
    if (usages.has(mapping.v3Api)) {
      failures.push(`still references non-v4 API ${mapping.v3Api}`)
    }
  }

  return failures
}

function compareExecutions(v3: SnippetExecutionResult, v4: SnippetExecutionResult): readonly string[] {
  const failures: string[] = []

  if (v4.timedOut) {
    failures.push("v4 execution timed out")
  }
  if (v4.exitCode !== 0) {
    failures.push(`v4 execution failed with exit code ${String(v4.exitCode)}`)
  }
  if (v3.timedOut) {
    failures.push("v3 execution timed out")
  }
  if (v3.exitCode !== 0) {
    failures.push(`v3 execution failed with exit code ${String(v3.exitCode)}`)
  }
  if (v3.exitCode === 0 && v4.exitCode === 0 && v3.stdout !== v4.stdout) {
    failures.push("v3/v4 stdout differs")
  }
  if (v3.exitCode === 0 && v4.exitCode === 0 && v3.stderr !== v4.stderr) {
    failures.push("v3/v4 stderr differs")
  }

  return failures
}

function compareViewFailures(compareStep: TourStep, compareCodeV3: string, compareCodeV4: string): readonly string[] {
  const failures: string[] = []
  const view = getTourCompareView(compareStep)

  if (view.v3Code !== compareCodeV3 || view.v4Code !== compareCodeV4) {
    failures.push("compare view does not match the selected code pair")
  }
  if (view.identical && view.changeSummary !== COMPARE_SUMMARY_IDENTICAL) {
    failures.push("identical compare summary text is inconsistent")
  }
  if (!view.identical && view.changeSummary !== COMPARE_SUMMARY_CHANGED) {
    failures.push("changed compare summary text is inconsistent")
  }
  if (view.v4Code === EMPTY_COMPARE_CODE) {
    failures.push("compare view is missing v4 code")
  }

  return failures
}

export async function runTourV4Qa(options: {
  readonly projectRoot: string
  readonly seedPath: string
  readonly artifactPath: string
  readonly mappingsPath: string
}): Promise<TourQaReport> {
  const lessons = extractTourLessonsFromSeedFile(options.seedPath)
  const artifact = loadTourMigrationArtifact(options.artifactPath)
  const lessonStepsByName = buildLessonStepsByName(lessons)
  const lessonShapes = lessons.map((lesson) => ({
    slug: lesson.slug,
    steps: lesson.steps.map((step) => ({ orderIndex: step.orderIndex })),
  }))
  const stepMap = validateTourMigrationArtifact(artifact, lessonShapes)
  const mappings = loadMigrationMappings(options.mappingsPath)
  const tempDir = mkdtempSync(path.join(options.projectRoot, ".tmp-tour-v4-qa-"))

  try {
    const results: TourStepQaResult[] = []

    for (const lesson of lessons) {
      for (const step of lesson.steps) {
        const artifactStep = stepMap.get(buildTourArtifactStepKey(step.slug, step.orderIndex))
        if (!artifactStep) {
          throw new Error(`Missing artifact step for ${step.slug}:${step.orderIndex}`)
        }

        const compareStep = buildTourStep(step, artifactStep)
        const compareView = getTourCompareView(compareStep)
        const typecheckBase = `${step.slug}-${step.orderIndex}`
        const v4TypecheckErrors = typecheckSnippet(options.projectRoot, tempDir, `${typecheckBase}.v4`, compareView.v4Code)
        const v3TypecheckErrors = compareView.identical
          ? []
          : typecheckSnippet(options.projectRoot, tempDir, `${typecheckBase}.v3`, compareView.v3Code)
        const [v3Execution, v4Execution] = compareView.identical
          ? [EMPTY_EXECUTION_RESULT, EMPTY_EXECUTION_RESULT]
          : await Promise.all([
              executeSnippet(tempDir, `${typecheckBase}.v3`, compareView.v3Code),
              executeSnippet(tempDir, `${typecheckBase}.v4`, compareView.v4Code),
            ])

        const failures = [
          ...compareViewFailures(compareStep, compareView.v3Code, compareView.v4Code),
          ...v3TypecheckErrors.map((error) => `v3 typecheck: ${error}`),
          ...v4TypecheckErrors.map((error) => `v4 typecheck: ${error}`),
          ...(compareView.identical ? [] : compareExecutions(v3Execution, v4Execution)),
          ...collectOptimalityFailures(compareView.v4Code, mappings),
        ]

        results.push({
          stepKey: `${step.slug}:${step.orderIndex}`,
          slug: lesson.slug,
          lessonTitle: lesson.title,
          orderIndex: step.orderIndex,
          title: step.title,
          identical: compareView.identical,
          failures,
          v3: {
            typecheckErrors: v3TypecheckErrors,
            execution: v3Execution,
          },
          v4: {
            typecheckErrors: v4TypecheckErrors,
            execution: v4Execution,
          },
        })
      }
    }

    const failed = results.filter((result) => result.failures.length > 0).length

    return {
      artifactPath: options.artifactPath,
      seedPath: options.seedPath,
      generatedAt: new Date().toISOString(),
      summary: {
        stepCount: results.length,
        passed: results.length - failed,
        failed,
      },
      results,
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}
