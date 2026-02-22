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
    const { resourceFromAttributes } = await import("@opentelemetry/resources")
    const { ATTR_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } = await import(
      "@opentelemetry/semantic-conventions"
    )
    const { getAppEnv } = await import("@/lib/env")

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "effect-talk-website",
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: getAppEnv(),
    })

    const sdk = new NodeSDK({
      resource,
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
