const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development"
const isPerfEnabled = process.env.NEXT_PUBLIC_ENABLE_TOUR_PERF === "1" || process.env.ENABLE_TOUR_PERF === "1"

function shouldLogPerfMetric(): boolean {
  return isDev || isPerfEnabled
}

export function logTourServerMetric(name: string, durationMs: number): void {
  if (!shouldLogPerfMetric()) return
  console.debug(`[tour-perf][server] ${name}=${durationMs.toFixed(1)}ms`)
}

export function logTourClientMetric(name: string, durationMs: number): void {
  if (!shouldLogPerfMetric()) return
  console.debug(`[tour-perf][client] ${name}=${durationMs.toFixed(1)}ms`)
}
