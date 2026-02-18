/**
 * Lightweight HTTP baseline checker for Tour pages.
 *
 * Usage:
 *   bun run scripts/tour-performance-baseline.ts
 *   TOUR_BASE_URL=http://localhost:3000 bun run scripts/tour-performance-baseline.ts
 *   TOUR_SAMPLE_SLUG=intro-to-effects bun run scripts/tour-performance-baseline.ts
 */

interface MeasureResult {
  readonly path: string
  readonly status: number
  readonly durationMs: number
  readonly bytes: number
}

interface SummaryStats {
  readonly minMs: number
  readonly p50Ms: number
  readonly p95Ms: number
  readonly maxMs: number
  readonly avgMs: number
}

function parseBytes(contentLengthHeader: string | null, fallbackBytes: number): number {
  if (!contentLengthHeader) {
    return fallbackBytes
  }
  const parsed = Number.parseInt(contentLengthHeader, 10)
  return Number.isFinite(parsed) ? parsed : fallbackBytes
}

function percentile(sortedValues: readonly number[], p: number): number {
  if (sortedValues.length === 0) return 0
  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * p))
  return sortedValues[index] ?? 0
}

function summarizeDurations(durations: readonly number[]): SummaryStats {
  if (durations.length === 0) {
    return { minMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0, avgMs: 0 }
  }

  const sorted = [...durations].sort((a, b) => a - b)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return {
    minMs: sorted[0] ?? 0,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    avgMs: total / sorted.length,
  }
}

async function measurePath(baseUrl: string, path: string): Promise<MeasureResult> {
  const url = `${baseUrl}${path}`
  const start = performance.now()
  const response = await fetch(url, { method: "GET", redirect: "follow" })
  const text = await response.text()
  const durationMs = performance.now() - start
  const bytes = parseBytes(response.headers.get("content-length"), new TextEncoder().encode(text).length)
  return {
    path,
    status: response.status,
    durationMs,
    bytes,
  }
}

async function runForPath(baseUrl: string, path: string, samples: number): Promise<void> {
  const runs: MeasureResult[] = []
  for (let index = 0; index < samples; index += 1) {
    runs.push(await measurePath(baseUrl, path))
  }
  const durations = runs.map((result) => result.durationMs)
  const stats = summarizeDurations(durations)
  const latest = runs[runs.length - 1]

  console.log(`\nPath: ${path}`)
  console.log(`  status: ${latest?.status ?? 0}`)
  console.log(`  response-bytes: ${latest?.bytes ?? 0}`)
  console.log(
    `  duration-ms: min=${stats.minMs.toFixed(1)} p50=${stats.p50Ms.toFixed(1)} p95=${stats.p95Ms.toFixed(1)} max=${stats.maxMs.toFixed(1)} avg=${stats.avgMs.toFixed(1)}`
  )
}

async function main(): Promise<void> {
  const baseUrl = process.env.TOUR_BASE_URL ?? "http://localhost:3000"
  const sampleSlug = process.env.TOUR_SAMPLE_SLUG ?? "your-lesson-slug"
  const samples = Number.parseInt(process.env.TOUR_SAMPLES ?? "5", 10)

  if (!Number.isFinite(samples) || samples <= 0) {
    throw new Error(`TOUR_SAMPLES must be a positive integer, received: ${process.env.TOUR_SAMPLES}`)
  }

  console.log(`[tour-baseline] base-url=${baseUrl} samples=${samples} sample-slug=${sampleSlug}`)
  console.log("[tour-baseline] Make sure `bun run dev` is running in another terminal")

  await runForPath(baseUrl, "/tour", samples)
  await runForPath(baseUrl, `/tour/${sampleSlug}`, samples)
}

main().catch((error) => {
  console.error("[tour-baseline] failed:", error)
  process.exitCode = 1
})
