import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { RegistryProvider } from "@effect-atom/atom-react"
import { useTourProgress, _resetLoaderState } from "@/hooks/useTourProgress"
import type { TourStep } from "@/services/TourProgress/types"
import type { ReactNode } from "react"

// Mock the sync module
const mockGetLocalStorageProgress = vi.fn(() => ({}))
const mockSetLocalStorageStepCompleted = vi.fn()
const mockSyncProgressToDB = vi.fn(async () => {})
const mockFetchProgressFromAPI = vi.fn(async () => [])
const mockPersistStepCompleted = vi.fn(async () => {})

vi.mock("@/lib/tourProgressSync", () => ({
  getLocalStorageProgress: (...args: unknown[]) => mockGetLocalStorageProgress(...args),
  setLocalStorageStepCompleted: (...args: unknown[]) => mockSetLocalStorageStepCompleted(...args),
  syncProgressToDB: (...args: unknown[]) => mockSyncProgressToDB(...args),
  fetchProgressFromAPI: (...args: unknown[]) => mockFetchProgressFromAPI(...args),
  persistStepCompleted: (...args: unknown[]) => mockPersistStepCompleted(...args),
}))

/** Wrapper that provides an isolated atom registry per test. */
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

const steps: readonly TourStep[] = [makeStep("s1"), makeStep("s2"), makeStep("s3")]

describe("useTourProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetLocalStorageProgress.mockReturnValue({})
    mockSyncProgressToDB.mockResolvedValue(undefined)
    mockFetchProgressFromAPI.mockResolvedValue([])
    mockPersistStepCompleted.mockResolvedValue(undefined)
    _resetLoaderState()
  })

  it("starts with empty completedStepIds and transitions isLoading to false", async () => {
    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: false }),
      { wrapper }
    )
    expect(result.current.completedStepIds.size).toBe(0)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("loads guest progress from localStorage", async () => {
    mockGetLocalStorageProgress.mockReturnValue({
      s1: "completed",
      s2: "skipped",
    })

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: false }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completedStepIds.has("s1")).toBe(true)
    expect(result.current.completedStepIds.has("s2")).toBe(false) // skipped != completed
  })

  it("filters completed IDs to only valid steps", async () => {
    mockGetLocalStorageProgress.mockReturnValue({
      s1: "completed",
      "unknown-step": "completed",
    })

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: false }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completedStepIds.has("s1")).toBe(true)
    expect(result.current.completedStepIds.has("unknown-step")).toBe(false)
  })

  it("loads authenticated progress from API and merges with localStorage", async () => {
    mockGetLocalStorageProgress.mockReturnValue({ s1: "completed" })
    mockFetchProgressFromAPI.mockResolvedValue([
      { step_id: "s2", status: "completed" },
      { step_id: "s3", status: "not_started" },
    ])

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.completedStepIds.has("s1")).toBe(true)  // from localStorage
    expect(result.current.completedStepIds.has("s2")).toBe(true)  // from API
    expect(result.current.completedStepIds.has("s3")).toBe(false) // not_started
    expect(mockSyncProgressToDB).toHaveBeenCalled()
  })

  describe("markStepCompleted", () => {
    it("updates atom and persists to localStorage for guest", async () => {
      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: false }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.markStepCompleted("s1")
      })

      expect(result.current.completedStepIds.has("s1")).toBe(true)
      expect(mockSetLocalStorageStepCompleted).toHaveBeenCalledWith("s1")
      expect(mockPersistStepCompleted).not.toHaveBeenCalled()
    })

    it("also persists to DB for logged-in user", async () => {
      mockFetchProgressFromAPI.mockResolvedValue([])

      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: true }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.markStepCompleted("s1")
      })

      expect(mockSetLocalStorageStepCompleted).toHaveBeenCalledWith("s1")
      expect(mockPersistStepCompleted).toHaveBeenCalledWith("s1")
    })

    it("ignores invalid step IDs", async () => {
      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: false }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.markStepCompleted("not-a-real-step")
      })

      expect(mockSetLocalStorageStepCompleted).not.toHaveBeenCalled()
    })

    it("skips already-completed steps — no duplicate API calls", async () => {
      mockGetLocalStorageProgress.mockReturnValue({ s1: "completed" })
      mockFetchProgressFromAPI.mockResolvedValue([])

      const { result } = renderHook(
        () => useTourProgress({ steps, isLoggedIn: true }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.completedStepIds.has("s1")).toBe(true)
      })

      act(() => {
        result.current.markStepCompleted("s1")
      })

      expect(mockSetLocalStorageStepCompleted).not.toHaveBeenCalled()
      expect(mockPersistStepCompleted).not.toHaveBeenCalled()
    })
  })

  it("preserves data when API fetch fails", async () => {
    mockGetLocalStorageProgress.mockReturnValue({ s1: "completed" })
    mockFetchProgressFromAPI.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(
      () => useTourProgress({ steps, isLoggedIn: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // localStorage data preserved despite API failure
    expect(result.current.completedStepIds.has("s1")).toBe(true)
  })
})
