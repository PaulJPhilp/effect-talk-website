export function silenceConsole(method: "error" | "warn" = "error"): () => void {
  const original = console[method];

  console[method] = (() => {
    // Intentionally silence console noise in tests.
  }) as (typeof console)[typeof method];

  return () => {
    console[method] = original;
  };
}
