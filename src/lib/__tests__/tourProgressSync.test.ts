/**
 * Tests for tourProgressSync — localStorage and fetch functions.
 *
 * localStorage tests use the real happy-dom localStorage.
 * Fetch tests override globalThis.fetch with a recording fake
 * and assert on outcomes (return values, localStorage state,
 * captured request data). No vi.spyOn or call-verification.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  getLocalStorageProgress,
  setLocalStorageStepCompleted,
  clearLocalStorageProgress,
  syncProgressToDB,
  fetchProgressFromAPI,
  persistStepCompleted,
} from "@/lib/tourProgressSync"

/** Captured request from the fake fetch. */
interface CapturedRequest {
  url: string
  init?: RequestInit
}

/**
 * Replace globalThis.fetch with a fake that records calls and
 * returns a configurable response.
 */
function installFakeFetch(
  response: Response = new Response(
    JSON.stringify({ ok: true }),
    { status: 200 },
  ),
) {
  const captured: CapturedRequest[] = []
  const originalFetch = globalThis.fetch
  let currentResponse = response
  let shouldReject = false
  let rejectError: Error | null = null

  globalThis.fetch = (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    captured.push({ url, init })
    if (shouldReject) {
      return Promise.reject(rejectError ?? new Error("fetch error"))
    }
    return Promise.resolve(currentResponse.clone())
  }

  return {
    captured,
    setResponse(r: Response) {
      currentResponse = r
    },
    setReject(err: Error) {
      shouldReject = true
      rejectError = err
    },
    restore() {
      globalThis.fetch = originalFetch
    },
  }
}

describe("tourProgressSync", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── localStorage tests (already compliant) ──────────────

  describe("getLocalStorageProgress", () => {
    it("returns empty object when nothing stored", () => {
      expect(getLocalStorageProgress()).toEqual({})
    })

    it("returns parsed progress from localStorage", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({
          "step-1": "completed",
          "step-2": "skipped",
        }),
      )
      expect(getLocalStorageProgress()).toEqual({
        "step-1": "completed",
        "step-2": "skipped",
      })
    })

    it("returns empty object on invalid JSON", () => {
      localStorage.setItem("tour_progress", "not-json")
      expect(getLocalStorageProgress()).toEqual({})
    })
  })

  describe("setLocalStorageStepCompleted", () => {
    it("sets a step as completed in localStorage", () => {
      setLocalStorageStepCompleted("step-1")
      const stored = JSON.parse(
        localStorage.getItem("tour_progress")!,
      )
      expect(stored).toEqual({ "step-1": "completed" })
    })

    it("preserves existing progress", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" }),
      )
      setLocalStorageStepCompleted("step-2")
      const stored = JSON.parse(
        localStorage.getItem("tour_progress")!,
      )
      expect(stored).toEqual({
        "step-1": "completed",
        "step-2": "completed",
      })
    })

    it("overwrites existing status for the same step", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "skipped" }),
      )
      setLocalStorageStepCompleted("step-1")
      const stored = JSON.parse(
        localStorage.getItem("tour_progress")!,
      )
      expect(stored).toEqual({ "step-1": "completed" })
    })
  })

  describe("clearLocalStorageProgress", () => {
    it("removes progress from localStorage", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" }),
      )
      clearLocalStorageProgress()
      expect(localStorage.getItem("tour_progress")).toBeNull()
    })

    it("does not throw when nothing stored", () => {
      expect(() => clearLocalStorageProgress()).not.toThrow()
    })
  })

  // ── Fetch tests (rewritten — no spies) ──────────────────

  describe("syncProgressToDB", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch()
    })
    afterEach(() => {
      fake.restore()
    })

    it("does nothing when localStorage is empty", async () => {
      await syncProgressToDB()
      expect(fake.captured).toHaveLength(0)
    })

    it("sends localStorage progress to sync endpoint", async () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({
          "step-1": "completed",
          "step-2": "skipped",
        }),
      )

      await syncProgressToDB()

      expect(fake.captured).toHaveLength(1)
      expect(fake.captured[0].url).toBe("/api/tour/progress/sync")
      expect(fake.captured[0].init?.method).toBe("POST")
      const body = JSON.parse(
        fake.captured[0].init?.body as string,
      )
      expect(body).toEqual({
        progress: [
          { stepId: "step-1", status: "completed" },
          { stepId: "step-2", status: "skipped" },
        ],
      })
    })

    it("keeps localStorage after successful sync", async () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" }),
      )

      await syncProgressToDB()

      expect(
        localStorage.getItem("tour_progress"),
      ).not.toBeNull()
    })

    it("keeps localStorage when sync returns non-OK", async () => {
      fake.setResponse(
        new Response("Unauthorized", { status: 401 }),
      )
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" }),
      )

      await syncProgressToDB()

      expect(
        localStorage.getItem("tour_progress"),
      ).not.toBeNull()
    })

    it("keeps localStorage when fetch throws", async () => {
      fake.setReject(new Error("Network error"))
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" }),
      )

      await syncProgressToDB()

      expect(
        localStorage.getItem("tour_progress"),
      ).not.toBeNull()
    })
  })

  describe("fetchProgressFromAPI", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch(
        new Response(JSON.stringify({ progress: [] }), {
          status: 200,
        }),
      )
    })
    afterEach(() => {
      fake.restore()
    })

    it("fetches progress from the API", async () => {
      fake.setResponse(
        new Response(
          JSON.stringify({
            progress: [
              { step_id: "step-1", status: "completed" },
              { step_id: "step-2", status: "not_started" },
            ],
          }),
          { status: 200 },
        ),
      )

      const result = await fetchProgressFromAPI()

      expect(fake.captured[0].url).toBe("/api/tour/progress")
      expect(fake.captured[0].init?.method).toBe("GET")
      expect(result).toEqual([
        { step_id: "step-1", status: "completed" },
        { step_id: "step-2", status: "not_started" },
      ])
    })

    it("returns empty array on non-OK response", async () => {
      fake.setResponse(
        new Response("Unauthorized", { status: 401 }),
      )

      const result = await fetchProgressFromAPI()
      expect(result).toEqual([])
    })

    it("returns empty array when no progress field", async () => {
      fake.setResponse(
        new Response(JSON.stringify({}), { status: 200 }),
      )

      const result = await fetchProgressFromAPI()
      expect(result).toEqual([])
    })
  })

  describe("persistStepCompleted", () => {
    let fake: ReturnType<typeof installFakeFetch>

    beforeEach(() => {
      fake = installFakeFetch()
    })
    afterEach(() => {
      fake.restore()
    })

    it("sends POST to API with step ID and status", async () => {
      await persistStepCompleted("step-1")

      expect(fake.captured).toHaveLength(1)
      expect(fake.captured[0].url).toBe("/api/tour/progress")
      expect(fake.captured[0].init?.method).toBe("POST")
      const body = JSON.parse(
        fake.captured[0].init?.body as string,
      )
      expect(body).toEqual({
        stepId: "step-1",
        status: "completed",
      })
    })
  })
})
