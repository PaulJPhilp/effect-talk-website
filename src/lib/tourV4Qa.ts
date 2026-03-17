import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  Clock,
  Effect as EffectModule,
  Either as EitherModule,
  FiberRef,
  Logger,
  Request,
  RequestResolver,
  Schema as SchemaModule,
  Stream as StreamModule,
  Tracer,
} from "effect";
import ts from "typescript";
import { EMPTY_COMPARE_CODE, getTourCompareView } from "@/lib/tourCompare";
import {
  indexTourManifest,
  loadTourManifest,
  type TourManifest,
} from "@/lib/tourManifest";
import {
  type TourMigrationArtifact,
  type TourMigrationArtifactStep,
  type TourMigrationContractMetadata,
  validateTourMigrationArtifact,
} from "@/lib/tourMigrationArtifact";
import type { TourStep } from "@/services/TourProgress/types";

export interface SnippetExecutionResult {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly timedOut: boolean;
}

export interface SnippetQaResult {
  readonly execution: SnippetExecutionResult;
  readonly typecheckErrors: readonly string[];
}

export interface TourStepQaResult {
  readonly comparisonMode: "identical" | "validated" | "historical-v3-skipped";
  readonly failures: readonly string[];
  readonly identical: boolean;
  readonly lessonTitle: string;
  readonly migrationStatus: "unchanged" | "auto-certified" | "review-needed";
  readonly orderIndex: number;
  readonly slug: string;
  readonly stepKey: string;
  readonly title: string;
  readonly v3: SnippetQaResult;
  readonly v4: SnippetQaResult;
}

export interface TourQaSummary {
  readonly autoCertifiedCount: number;
  readonly failed: number;
  readonly historicalV3SkippedCount: number;
  readonly identicalCount: number;
  readonly passed: number;
  readonly reviewNeededCount: number;
  readonly stepCount: number;
  readonly unchangedCount: number;
  readonly validatedCount: number;
}

export interface TourQaReport {
  readonly artifactPath: string;
  readonly generatedAt: string;
  readonly manifestPath: string;
  readonly results: readonly TourStepQaResult[];
  readonly summary: TourQaSummary;
}

const EMPTY_EXECUTION_RESULT: SnippetExecutionResult = {
  exitCode: 0,
  stdout: "",
  stderr: "",
  timedOut: false,
};

const EFFECT_MODULES: Readonly<Record<string, object>> = {
  Clock,
  Either: EitherModule,
  Effect: EffectModule,
  FiberRef,
  Logger,
  Request,
  RequestResolver,
  Schema: SchemaModule,
  Stream: StreamModule,
  Tracer,
};

const normalizeText = (value: string): string =>
  value.replace(/\r\n/g, "\n").trim();

export function loadTourMigrationArtifact(
  filePath: string
): TourMigrationArtifact {
  return JSON.parse(readFileSync(filePath, "utf8")) as TourMigrationArtifact;
}

export function loadTourMigrationMetadata(
  filePath: string
): TourMigrationContractMetadata {
  return JSON.parse(
    readFileSync(filePath, "utf8")
  ) as TourMigrationContractMetadata;
}

function buildTourStep(
  lesson: TourManifest["lessons"][number],
  step: TourManifest["lessons"][number]["steps"][number],
  artifactStep: TourMigrationArtifact["lessons"][number]["steps"][number]
): TourStep {
  return {
    id: `${lesson.slug}:${step.orderIndex}`,
    lesson_id: lesson.slug,
    order_index: step.orderIndex,
    title: step.title,
    instruction: step.instruction,
    concept_code: artifactStep.conceptCode ?? null,
    concept_code_v4: artifactStep.migratedConceptCode,
    concept_code_language: step.conceptCodeLanguage,
    solution_code: artifactStep.solutionCode ?? null,
    solution_code_v4: artifactStep.migratedSolutionCode,
    playground_url: step.playgroundUrl,
    hints: step.hints,
    feedback_on_complete: step.feedbackOnComplete,
    pattern_id:
      artifactStep.solutionMigrationReport?.primitives[0]?.id ??
      artifactStep.conceptMigrationReport?.primitives[0]?.id ??
      artifactStep.solutionMatchedPatternIds?.[0] ??
      artifactStep.conceptMatchedPatternIds?.[0] ??
      null,
    migration_status: artifactStep.migrationStatus,
    v3_source_ref: artifactStep.conceptProvenance.docsRef,
    v3_source_path: artifactStep.conceptProvenance.filePath,
    created_at: "1970-01-01T00:00:00.000Z",
  };
}

function createCompilerOptions(projectRoot: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(
    projectRoot,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  if (!configPath) {
    throw new Error(`Unable to find tsconfig.json from ${projectRoot}`);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );
  return {
    ...parsed.options,
    incremental: false,
    noEmit: true,
  };
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || typeof diagnostic.start !== "number") {
    return message;
  }
  const position = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start
  );
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${message}`;
}

function typecheckSnippet(
  projectRoot: string,
  tempDir: string,
  label: string,
  code: string
): readonly string[] {
  const filePath = path.join(tempDir, `${label}.ts`);
  writeFileSync(filePath, `${code}\n`, "utf8");

  const compilerOptions = createCompilerOptions(projectRoot);
  const program = ts.createProgram([filePath], compilerOptions);
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );

  return diagnostics.map(formatDiagnostic);
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
`;
}

async function executeSnippet(
  tempDir: string,
  label: string,
  code: string
): Promise<SnippetExecutionResult> {
  const subjectPath = path.join(tempDir, `${label}.ts`);
  const runnerPath = path.join(tempDir, `${label}.runner.mjs`);
  writeFileSync(subjectPath, `${code}\n`, "utf8");
  writeFileSync(
    runnerPath,
    buildRuntimeHarness(`./${path.basename(subjectPath)}`),
    "utf8"
  );

  const child = Bun.spawn({
    cmd: ["bun", runnerPath],
    cwd: tempDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const timeoutId = setTimeout(() => {
    child.kill();
  }, 5000);

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  clearTimeout(timeoutId);

  return {
    exitCode,
    stdout: normalizeText(stdout),
    stderr: normalizeText(stderr),
    timedOut: child.signalCode !== null,
  };
}

function collectQualifiedUsages(code: string): ReadonlySet<string> {
  const sourceFile = ts.createSourceFile(
    "snippet.ts",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const usages = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      usages.add(node.getText(sourceFile));
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      usages.add(node.expression.getText(sourceFile));
    }
    if (ts.isQualifiedName(node)) {
      usages.add(node.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return usages;
}

function collectOptimalityFailures(
  code: string,
  metadata: TourMigrationContractMetadata,
  artifactStep: TourMigrationArtifact["lessons"][number]["steps"][number]
): readonly string[] {
  const failures: string[] = [];

  if (
    artifactStep.migrationStatus === "auto-certified" &&
    ((artifactStep.reviewRequiredReasonCodes?.length ?? 0) > 0 ||
      artifactStep.conceptHasManualReview ||
      artifactStep.solutionHasManualReview ||
      artifactStep.conceptMigrationReport?.snippetStatus === "review-needed" ||
      artifactStep.solutionMigrationReport?.snippetStatus === "review-needed")
  ) {
    failures.push("auto-certified step still contains manual-review markers");
  }

  const usages = collectQualifiedUsages(code);
  for (const blockedApi of metadata.blockedV3Apis) {
    if (usages.has(blockedApi)) {
      failures.push(`still references non-v4 API ${blockedApi}`);
    }
  }

  return failures;
}

function collectReportBlockedV3ApiUsages(
  artifactStep: TourMigrationArtifactStep,
  metadata: TourMigrationContractMetadata
): readonly string[] {
  const reports = [
    artifactStep.conceptMigrationReport,
    artifactStep.solutionMigrationReport,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  if (reports.length === 0) {
    return [];
  }

  const blocked = new Set<string>();
  for (const report of reports) {
    for (const primitive of report.primitives) {
      if (metadata.blockedV3Apis.includes(primitive.original)) {
        blocked.add(primitive.original);
      }
    }
  }

  return [...blocked].sort((left, right) => left.localeCompare(right));
}

function collectBlockedV3ApiUsages(
  code: string,
  metadata: TourMigrationContractMetadata
): readonly string[] {
  const usages = collectQualifiedUsages(code);
  return metadata.blockedV3Apis.filter((blockedApi) => usages.has(blockedApi));
}

function collectArtifactBlockedV3ApiUsages(
  artifactStep: TourMigrationArtifact["lessons"][number]["steps"][number],
  metadata: TourMigrationContractMetadata
): readonly string[] {
  const matchedPatternIds = [
    ...(artifactStep.conceptMatchedPatternIds ?? []),
    ...(artifactStep.solutionMatchedPatternIds ?? []),
  ];
  if (matchedPatternIds.length === 0) {
    return [];
  }

  const blocked = new Set<string>();
  for (const blockedApi of metadata.blockedV3Apis) {
    for (const patternId of matchedPatternIds) {
      if (patternId.endsWith(`:${blockedApi}`)) {
        blocked.add(blockedApi);
      }
    }
  }

  return [...blocked].sort((left, right) => left.localeCompare(right));
}

function isHistoricalApiAvailableInCurrentEffect(api: string): boolean {
  const parts = api.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [namespace, member] = parts;
  const moduleValue = EFFECT_MODULES[namespace];
  if (!moduleValue) {
    return false;
  }

  return member in moduleValue;
}

function compareExecutions(
  v3: SnippetExecutionResult,
  v4: SnippetExecutionResult
): readonly string[] {
  const failures: string[] = [];

  if (v4.timedOut) {
    failures.push("v4 execution timed out");
  }
  if (v4.exitCode !== 0) {
    failures.push(`v4 execution failed with exit code ${String(v4.exitCode)}`);
  }
  if (v3.timedOut) {
    failures.push("v3 execution timed out");
  }
  if (v3.exitCode !== 0) {
    failures.push(`v3 execution failed with exit code ${String(v3.exitCode)}`);
  }
  if (v3.exitCode === 0 && v4.exitCode === 0 && v3.stdout !== v4.stdout) {
    failures.push("v3/v4 stdout differs");
  }
  if (v3.exitCode === 0 && v4.exitCode === 0 && v3.stderr !== v4.stderr) {
    failures.push("v3/v4 stderr differs");
  }

  return failures;
}

function compareViewFailures(
  compareStep: TourStep,
  expected: {
    readonly conceptIdentical: boolean;
    readonly solutionIdentical: boolean;
    readonly identical: boolean;
  }
): readonly string[] {
  const failures: string[] = [];
  const view = getTourCompareView(compareStep);

  if (view.conceptIdentical !== expected.conceptIdentical) {
    failures.push("compare view concept diff state is inconsistent");
  }
  if (view.solutionIdentical !== expected.solutionIdentical) {
    failures.push("compare view solution diff state is inconsistent");
  }
  if (view.identical !== expected.identical) {
    failures.push("compare view identical state is inconsistent");
  }
  if (view.v4Code === EMPTY_COMPARE_CODE) {
    failures.push("compare view is missing v4 code");
  }

  return failures;
}

export async function runTourV4Qa(options: {
  readonly projectRoot: string;
  readonly manifestPath: string;
  readonly artifactPath: string;
  readonly metadataPath?: string;
}): Promise<TourQaReport> {
  const manifest = loadTourManifest(options.manifestPath);
  const artifact = loadTourMigrationArtifact(options.artifactPath);
  const metadata = options.metadataPath
    ? loadTourMigrationMetadata(options.metadataPath)
    : artifact.metadata;
  const stepMap = validateTourMigrationArtifact(artifact, manifest);

  if (metadata.artifactVersion !== artifact.version) {
    throw new Error(
      `Tour v4 metadata mismatch: metadata artifact version ${metadata.artifactVersion} does not match artifact version ${artifact.version}`
    );
  }
  if (
    metadata.generatedAt !== artifact.metadata.generatedAt ||
    metadata.mappingVersion !== artifact.metadata.mappingVersion
  ) {
    throw new Error(
      "Tour v4 metadata does not match the embedded artifact metadata"
    );
  }

  const manifestStepMap = indexTourManifest(manifest);
  const tempDir = mkdtempSync(
    path.join(options.projectRoot, ".tmp-tour-v4-qa-")
  );

  try {
    const results: TourStepQaResult[] = [];

    for (const [stepKey, entry] of manifestStepMap) {
      const artifactStep = stepMap.get(stepKey);
      if (!artifactStep) {
        throw new Error(`Missing artifact step for ${stepKey}`);
      }

      const compareStep = buildTourStep(entry.lesson, entry.step, artifactStep);
      const compareView = getTourCompareView(compareStep);
      const typecheckBase = `${entry.lesson.slug}-${entry.step.orderIndex}`;
      const v4TypecheckErrors = typecheckSnippet(
        options.projectRoot,
        tempDir,
        `${typecheckBase}.v4`,
        compareView.v4Code
      );
      const blockedV3Usages = compareView.identical
        ? []
        : collectReportBlockedV3ApiUsages(artifactStep, metadata).length > 0
          ? collectReportBlockedV3ApiUsages(artifactStep, metadata)
          : collectArtifactBlockedV3ApiUsages(artifactStep, metadata).length > 0
            ? collectArtifactBlockedV3ApiUsages(artifactStep, metadata)
            : collectBlockedV3ApiUsages(compareView.v3Code, metadata);
      const blockedUnsupportedV3Usages = blockedV3Usages.filter(
        (usage) => !isHistoricalApiAvailableInCurrentEffect(usage)
      );
      const attemptedV3TypecheckErrors = compareView.identical
        ? []
        : typecheckSnippet(
            options.projectRoot,
            tempDir,
            `${typecheckBase}.v3`,
            compareView.v3Code
          );
      const skipHistoricalV3Validation =
        blockedUnsupportedV3Usages.length > 0 &&
        attemptedV3TypecheckErrors.length > 0;
      const comparisonMode = compareView.identical
        ? "identical"
        : skipHistoricalV3Validation
          ? "historical-v3-skipped"
          : "validated";
      const v3TypecheckErrors = skipHistoricalV3Validation
        ? []
        : attemptedV3TypecheckErrors;
      const [v3Execution, v4Execution] =
        compareView.identical || skipHistoricalV3Validation
          ? [EMPTY_EXECUTION_RESULT, EMPTY_EXECUTION_RESULT]
          : await Promise.all([
              executeSnippet(
                tempDir,
                `${typecheckBase}.v3`,
                compareView.v3Code
              ),
              executeSnippet(
                tempDir,
                `${typecheckBase}.v4`,
                compareView.v4Code
              ),
            ]);

      const conceptIdentical =
        (artifactStep.conceptCode ?? EMPTY_COMPARE_CODE) ===
        artifactStep.migratedConceptCode;
      const solutionIdentical =
        (artifactStep.solutionCode ?? EMPTY_COMPARE_CODE) ===
        artifactStep.migratedSolutionCode;
      const identical = conceptIdentical && solutionIdentical;

      const failures = [
        ...compareViewFailures(compareStep, {
          conceptIdentical,
          solutionIdentical,
          identical,
        }),
        ...(artifactStep.migrationStatus === "auto-certified" &&
        artifactStep.expectedMigrationPolicy === "review-needed"
          ? ["auto-certified step contradicts manifest review-needed policy"]
          : []),
        ...(artifactStep.conceptMigrationReport &&
        artifactStep.conceptMigrationReport.resultCode !==
          artifactStep.migratedConceptCode
          ? [
              "concept migration report result does not match migrated concept code",
            ]
          : []),
        ...(artifactStep.solutionMigrationReport &&
        artifactStep.solutionMigrationReport.resultCode !==
          artifactStep.migratedSolutionCode
          ? [
              "solution migration report result does not match migrated solution code",
            ]
          : []),
        ...(artifactStep.conceptChanged &&
        artifactStep.conceptMigrationReport?.snippetStatus === "unchanged"
          ? ["concept migration report marks changed code as unchanged"]
          : []),
        ...(artifactStep.solutionChanged &&
        artifactStep.solutionMigrationReport?.snippetStatus === "unchanged"
          ? ["solution migration report marks changed code as unchanged"]
          : []),
        ...v3TypecheckErrors.map((error) => `v3 typecheck: ${error}`),
        ...v4TypecheckErrors.map((error) => `v4 typecheck: ${error}`),
        ...(compareView.identical || skipHistoricalV3Validation
          ? []
          : compareExecutions(v3Execution, v4Execution)),
        ...collectOptimalityFailures(
          compareView.v4Code,
          metadata,
          artifactStep
        ),
      ];

      results.push({
        stepKey,
        slug: entry.lesson.slug,
        lessonTitle: entry.lesson.title,
        orderIndex: entry.step.orderIndex,
        title: entry.step.title,
        identical: compareView.identical,
        comparisonMode,
        migrationStatus: artifactStep.migrationStatus,
        failures,
        v3: {
          typecheckErrors: v3TypecheckErrors,
          execution: v3Execution,
        },
        v4: {
          typecheckErrors: v4TypecheckErrors,
          execution: v4Execution,
        },
      });
    }

    const failed = results.filter(
      (result) => result.failures.length > 0
    ).length;

    return {
      artifactPath: options.artifactPath,
      manifestPath: options.manifestPath,
      generatedAt: new Date().toISOString(),
      summary: {
        stepCount: results.length,
        passed: results.length - failed,
        failed,
        identicalCount: results.filter(
          (result) => result.comparisonMode === "identical"
        ).length,
        validatedCount: results.filter(
          (result) => result.comparisonMode === "validated"
        ).length,
        historicalV3SkippedCount: results.filter(
          (result) => result.comparisonMode === "historical-v3-skipped"
        ).length,
        unchangedCount: results.filter(
          (result) => result.migrationStatus === "unchanged"
        ).length,
        autoCertifiedCount: results.filter(
          (result) => result.migrationStatus === "auto-certified"
        ).length,
        reviewNeededCount: results.filter(
          (result) => result.migrationStatus === "review-needed"
        ).length,
      },
      results,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
