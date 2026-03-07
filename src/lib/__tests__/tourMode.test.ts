import { describe, expect, it } from "vitest"
import { buildTourHref, cloneSearchParams, parseTourMode } from "@/lib/tourMode"

describe("tourMode", () => {
  it("defaults to v3 when mode is missing", () => {
    expect(parseTourMode(null)).toBe("v3")
  })

  it("defaults to v3 when mode is invalid", () => {
    expect(parseTourMode("beta-preview")).toBe("v3")
  })

  it("accepts valid mode values", () => {
    expect(parseTourMode("v3")).toBe("v3")
    expect(parseTourMode("v4")).toBe("v4")
    expect(parseTourMode("compare")).toBe("compare")
  })

  it("round-trips mode and step in generated URLs", () => {
    const searchParams = cloneSearchParams("step=2")
    expect(buildTourHref("/tour/pipes-and-flow", searchParams, { mode: "compare" })).toBe(
      "/tour/pipes-and-flow?step=2&mode=compare"
    )
  })
})
