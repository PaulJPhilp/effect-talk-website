import { describe, expect, it, beforeEach, vi } from "vitest"
import { Effect } from "effect"
import { NextRequest } from "next/server"
import { silenceConsole } from "@/test/console"

const insertFeedbackMock = vi.fn(() => Effect.void)
const sendFeedbackNotificationMock = vi.fn(() => Effect.void)
const trackEventMock = vi.fn(() => Effect.void)
const checkRateLimitMock = vi.fn(async () => ({
  allowed: true,
  remaining: 4,
  resetAt: Date.now() + 60_000,
}))

vi.mock("@/services/Db", () => ({
  insertFeedback: insertFeedbackMock,
}))

vi.mock("@/services/Email", () => ({
  sendFeedbackNotification: sendFeedbackNotificationMock,
}))

vi.mock("@/services/Analytics", () => ({
  trackEvent: trackEventMock,
}))

vi.mock("@/lib/rateLimit", () => ({
  RATE_LIMITS: {
    form: { maxRequests: 5, windowMs: 60_000 },
  },
  checkRateLimit: checkRateLimitMock,
}))

function buildRequest(payload: unknown, ip = "127.0.0.1"): NextRequest {
  return new NextRequest("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(payload),
  })
}

describe("POST /api/feedback unit", () => {
  beforeEach(() => {
    insertFeedbackMock.mockClear()
    sendFeedbackNotificationMock.mockClear()
    trackEventMock.mockClear()
    checkRateLimitMock.mockClear()
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 60_000,
    })
    insertFeedbackMock.mockReturnValue(Effect.void)
    sendFeedbackNotificationMock.mockReturnValue(Effect.void)
    trackEventMock.mockReturnValue(Effect.void)
  })

  it("returns 429 with rate-limit headers when blocked", async () => {
    checkRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 15_000,
    })
    const { POST } = await import("@/app/api/feedback/route")

    const response = await POST(
      buildRequest({
        email: "user@example.com",
        message: "Valid message with enough length.",
      })
    )

    expect(response.status).toBe(429)
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5")
    expect(response.headers.get("Retry-After")).toBeTruthy()
    expect(insertFeedbackMock).not.toHaveBeenCalled()
  })

  it("returns success and fires side effects on valid submission", async () => {
    const { POST } = await import("@/app/api/feedback/route")

    const response = await POST(
      buildRequest({
        name: "Test User",
        email: "user@example.com",
        message: "Valid message with enough length.",
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(insertFeedbackMock).toHaveBeenCalledWith({
      name: "Test User",
      email: "user@example.com",
      message: "Valid message with enough length.",
    })
    expect(sendFeedbackNotificationMock).toHaveBeenCalled()
    expect(trackEventMock).toHaveBeenCalledWith({ type: "feedback_submitted" })
  })

  it("returns 500 when feedback insertion fails", async () => {
    insertFeedbackMock.mockReturnValueOnce(Effect.fail(new Error("insert failed")) as never)
    const restoreConsole = silenceConsole("error")

    try {
      const { POST } = await import("@/app/api/feedback/route")
      const response = await POST(
        buildRequest({
          email: "user@example.com",
          message: "Valid message with enough length.",
        })
      )

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: "Failed to submit feedback. Please try again.",
      })
    } finally {
      restoreConsole()
    }
  })

  it("swallows notification failures and still returns success", async () => {
    sendFeedbackNotificationMock.mockReturnValueOnce(Effect.fail(new Error("email failed")) as never)
    const { POST } = await import("@/app/api/feedback/route")

    const response = await POST(
      buildRequest({
        email: "user@example.com",
        message: "Valid message with enough length.",
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })
})
