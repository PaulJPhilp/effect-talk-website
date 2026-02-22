export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS ?? ""
    const isPlaceholder =
      !headers || headers.includes("your-api-key-here")
    if (process.env.NODE_ENV === "development" && isPlaceholder) {
      console.info(
        "[Honeycomb] Tracing may not receive data: OTEL_EXPORTER_OTLP_HEADERS is unset or placeholder."
      )
    }

    const { NodeSDK } = await import("@opentelemetry/sdk-node")
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    )
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    )

    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-dns": { enabled: false },
          "@opentelemetry/instrumentation-net": { enabled: false },
        }),
      ],
    })

    sdk.start()
  }
}
