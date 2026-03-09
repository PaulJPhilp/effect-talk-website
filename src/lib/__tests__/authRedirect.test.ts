import { describe, expect, it } from "vitest"
import {
  buildPathWithSearchParams,
  encodeAuthReturnState,
  getSafeReturnPath,
  sanitizeReturnToPath,
} from "@/lib/authRedirect"

describe("authRedirect helpers", () => {
  it("accepts same-origin relative return paths", () => {
    expect(sanitizeReturnToPath("/tour/my-lesson?mode=compare&step=2")).toBe(
      "/tour/my-lesson?mode=compare&step=2"
    )
  })

  it("rejects unsafe return paths", () => {
    expect(sanitizeReturnToPath("https://example.com/tour")).toBeNull()
    expect(sanitizeReturnToPath("//evil.example/tour")).toBeNull()
  })

  it("falls back when return path is unsafe", () => {
    expect(getSafeReturnPath("https://example.com", "/settings")).toBe("/settings")
  })

  it("encodes AuthKit state with a return pathname", () => {
    const encoded = encodeAuthReturnState("/tour?mode=v4")
    expect(JSON.parse(atob(encoded))).toEqual({ returnPathname: "/tour?mode=v4" })
  })

  it("builds a path while preserving search params", () => {
    expect(
      buildPathWithSearchParams("/tour/pipes-and-flow", {
        mode: "compare",
        step: "2",
        tag: ["a", "b"],
      })
    ).toBe("/tour/pipes-and-flow?mode=compare&step=2&tag=a&tag=b")
  })
})
