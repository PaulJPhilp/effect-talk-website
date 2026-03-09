export function silenceConsole(method: "error" | "warn" = "error"): () => void {
  const original = console[method]

  console[method] = (() => {}) as typeof console[typeof method]

  return () => {
    console[method] = original
  }
}
