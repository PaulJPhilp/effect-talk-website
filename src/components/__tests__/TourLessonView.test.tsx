import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { TourLessonView } from "@/components/tour/TourLessonView"
import { _resetLoaderState } from "@/hooks/useTourProgress"
import { createTypedFakeFetch } from "@/test/fakeFetch"
import type { TourLessonWithSteps } from "@/services/TourProgress/types"

const navigationState = {
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => navigationState.searchParams,
  usePathname: () => "/tour/pipes-and-flow",
}))

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockCodeRunner(props: { readonly code: string; readonly panelTitle?: string }) {
      return (
        <div data-testid="code-runner">
          <span>{props.panelTitle ?? "Code"}</span>
          <pre>{props.code}</pre>
        </div>
      )
    },
}))

const lesson: TourLessonWithSteps = {
  id: "lesson-1",
  slug: "pipes-and-flow",
  title: "Pipes and flow",
  description: "Compose Effects in sequence.",
  order_index: 1,
  group: "Fundamentals",
  difficulty: "beginner",
  estimated_minutes: 10,
  created_at: "2026-03-07T00:00:00.000Z",
  steps: [
    {
      id: "step-1",
      lesson_id: "lesson-1",
      order_index: 1,
      title: "First step",
      instruction: "Read the first example.",
      concept_code: "console.log('first concept')",
      concept_code_v4: "console.log('first concept v4')",
      concept_code_language: "typescript",
      solution_code: "console.log('first solution')",
      solution_code_v4: "console.log('first solution v4')",
      playground_url: null,
      hints: null,
      feedback_on_complete: null,
      pattern_id: null,
      created_at: "2026-03-07T00:00:00.000Z",
    },
    {
      id: "step-2",
      lesson_id: "lesson-1",
      order_index: 2,
      title: "Second step",
      instruction: "Read the second example.",
      concept_code: "console.log('second concept')",
      concept_code_v4: "console.log('second concept v4')",
      concept_code_language: "typescript",
      solution_code: "console.log('second solution')",
      solution_code_v4: "console.log('second solution')",
      playground_url: null,
      hints: null,
      feedback_on_complete: null,
      pattern_id: null,
      created_at: "2026-03-07T00:00:00.000Z",
    },
  ],
}

describe("TourLessonView", () => {
  beforeEach(() => {
    navigationState.searchParams = new URLSearchParams()
    navigationState.replace.mockReset()
    localStorage.clear()
    _resetLoaderState()
    const originalFetch = globalThis.fetch
    vi.stubGlobal("fetch", createTypedFakeFetch({
      originalFetch,
      handler: async () => ({
        ok: true,
        json: async () => ({ progress: [] }),
      } as Response),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("preserves mode when restoring a saved step into the URL for logged-in users", async () => {
    localStorage.setItem("tour_last_step", JSON.stringify({ "pipes-and-flow": 2 }))
    navigationState.searchParams = new URLSearchParams("mode=compare")

    render(<TourLessonView lesson={lesson} isLoggedIn={true} />)

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith(
        "/tour/pipes-and-flow?mode=compare&step=2",
        { scroll: false }
      )
    })
  })

  it("falls back to v3 lesson navigation for guests", () => {
    navigationState.searchParams = new URLSearchParams("step=1&mode=compare")

    render(<TourLessonView lesson={lesson} isLoggedIn={false} />)

    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe(
      "/tour/pipes-and-flow?mode=v3&step=2"
    )
    expect(screen.getByRole("link", { name: "Lessons" }).getAttribute("href")).toBe(
      "/tour?mode=v3"
    )
  })
})
