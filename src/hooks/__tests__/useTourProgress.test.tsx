/**
 * Tests for useTourProgress hook.
 *
 * Uses real tourProgressSync functions with a globalThis.fetch
 * override. Asserts on rendered hook state and localStorage
 * outcomes — no vi.mock, no call-verification.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { RegistryProvider } from "@effect-atom/atom-react"
import {
  useTourProgress,
  _resetLoaderState,
} from "@/hooks/useTourProgress"
import type { TourStep } from "@/services/TourProgress/types"
import type { ReactNode } from "react"

/** Captured request from the fake fetch. */
interface CapturedRequest {
  url: string
  init?: RequestInit
}

function installFakeFetch() {
  const captured: CapturedRequest[] = []
  const originalFetch = globalThis.fetch
  const routes = new Map<string, () => Response>()
  let shouldReject = false

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
      return Promise.reject(new Error("Network error"))
    }
    const handler = routes.get(url)
    const resp = handler
      ? handler()
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
        })
    return Promise.resolve(resp)
  }

  return {
    captured,
    onGet(url: string, body: unknown) {
      routes.set(url, () =>
        new Response(JSON.stringify(body), { status: 200 }),
      )
    },
    setReject() {
      shouldReject = true
    },
    restore() {
      globalThis.fetch = originalFetch
    },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return RegistryProvider({ children })
}

function makeStep(id: string): TourStep {
  return {
    id,
    lesson_id: "lesson-1",
    order_index: 1,
    title: `Step ${id}`,
    instruction: "Do something",
    concept_code: null,
    concept_code_language: null,
    solution_code: null,
    playground_url: null,
    hints: null,
    feedback_on_complete: null,
    pattern_id: null,
    created_at: "2024-01-01T00:00:00Z",
  }
}

const steps: readonly TourStep[] = [
  makeStep("s1"),
  makeStep("s2"),
  makeStep("s3"),
]

describe("useTourProgress", () => {
  let fake: ReturnType<typeof installFakeFetch>

  beforeEach(() => {
    localStorage.clear()
    _resetLoaderState()
    fake = installFakeFetch()
    // Default: API returns empty progress
    fake.onGet("/api/tour/progress", { progress: [] })
  })

  afterEach(() => {
    fake.restore()
  })

  it("starts with empty completedStepIds and transitions isLoading to false", async () => {
    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: false }),
      { wrapper },
    )
    expect(result.current.completedStepIds.size).toBe(0)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("loads guest progress from localStorage", async () => {
    localStorage.setItem(
      "tour_progress",
      JSON.stringify({ s1: "completed", s2: "skipped" }),
    )

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: false }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completedStepIds.has("s1")).toBe(true)
    // skipped != completed
    expect(result.current.completedStepIds.has("s2")).toBe(false)
  })

  it("filters completed IDs to only valid steps", async () => {
    localStorage.setItem(
      "tour_progress",
      JSON.stringify({
        s1: "completed",
        "unknown-step": "completed",
      }),
    )

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: false }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completedStepIds.has("s1")).toBe(true)
    expect(
      result.current.completedStepIds.has("unknown-step"),
    ).toBe(false)
  })

  it("loads authenticated progress from API and merges with localStorage", async () => {
    localStorage.setItem(
      "tour_progress",
      JSON.stringify({ s1: "completed" }),
    )
    fake.onGet("/api/tour/progress", {
      progress: [
        { step_id: "s2", status: "completed" },
        { step_id: "s3", status: "not_started" },
      ],
    })

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: true }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // from localStorage
    expect(result.current.completedStepIds.has("s1")).toBe(true)
    // from API
    expect(result.current.completedStepIds.has("s2")).toBe(true)
    // not_started
    expect(result.current.completedStepIds.has("s3")).toBe(false)
    // Sync was called
    const syncReq = fake.captured.find(
      (r) => r.url === "/api/tour/progress/sync",
    )
    expect(syncReq).toBeDefined()
  })

  describe("markStepCompleted", () => {
    it("updates atom and persists to localStorage for guest", async () => {
      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: false }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.markStepCompleted("s1")
      })

      // Hook state updated
      expect(result.current.completedStepIds.has("s1")).toBe(true)
      // localStorage updated
      const stored = JSON.parse(
        localStorage.getItem("tour_progress")!,
      )
      expect(stored.s1).toBe("completed")
      // No API call made (guest)
      const apiReq = fake.captured.find(
        (r) =>
          r.url === "/api/tour/progress" &&
          r.init?.method === "POST",
      )
      expect(apiReq).toBeUndefined()
    })

    it("also persists to DB for logged-in user", async () => {
      fake.onGet("/api/tour/progress", { progress: [] })

      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: true }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.markStepCompleted("s1")
      })

      // localStorage updated
      const stored = JSON.parse(
        localStorage.getItem("tour_progress")!,
      )
      expect(stored.s1).toBe("completed")

      // Wait for fire-and-forget API call
      await waitFor(() => {
        const postReq = fake.captured.find(
          (r) =>
            r.url === "/api/tour/progress" &&
            r.init?.method === "POST",
        )
        expect(postReq).toBeDefined()
      })
    })

    it("ignores invalid step IDs", async () => {
      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: false }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.markStepCompleted("not-a-real-step")
      })

      // Nothing stored
      expect(
        localStorage.getItem("tour_progress"),
      ).toBeNull()
    })

    it("skips already-completed steps", async () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ s1: "completed" }),
      )
      fake.onGet("/api/tour/progress", { progress: [] })

      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: true }),
        { wrapper },
      )

      await waitFor(() => {
        expect(result.current.completedStepIds.has("s1")).toBe(
          true,
        )
      })

      // Clear captured so we can check no new POST
      const capturedBefore = fake.captured.length

      act(() => {
        result.current.markStepCompleted("s1")
      })

      // No new fetch call after the existing ones
      const newPosts = fake.captured
        .slice(capturedBefore)
        .filter(
          (r) =>
            r.url === "/api/tour/progress" &&
            r.init?.method === "POST",
        )
      expect(newPosts).toHaveLength(0)
    })
  })

  it("preserves data when API fetch fails", async () => {
    localStorage.setItem(
      "tour_progress",
      JSON.stringify({ s1: "completed" }),
    )
    fake.setReject()

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: true }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // localStorage data preserved despite API failure
    expect(result.current.completedStepIds.has("s1")).toBe(true)
  })
})
