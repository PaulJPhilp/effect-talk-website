import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { RegistryProvider } from "@effect-atom/atom-react"
import { useAllTourProgress } from "@/hooks/useAllTourProgress"
import { _resetLoaderState } from "@/hooks/useTourProgress"
import type { ReactNode } from "react"

const mockGetLocalStorageProgress = vi.fn(() => ({}))
const mockSyncProgressToDB = vi.fn(async () => {})
const mockFetchProgressFromAPI = vi.fn(async () => [])

vi.mock("@/lib/tourProgressSync", () => ({
  getLocalStorageProgress: (...args: unknown[]) => mockGetLocalStorageProgress(...args),
  setLocalStorageStepCompleted: vi.fn(),
  syncProgressToDB: (...args: unknown[]) => mockSyncProgressToDB(...args),
  fetchProgressFromAPI: (...args: unknown[]) => mockFetchProgressFromAPI(...args),
  persistStepCompleted: vi.fn(async () => {}),
}))

function wrapper({ children }: { children: ReactNode }) {
  return RegistryProvider({ children })
}

describe("useAllTourProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetLocalStorageProgress.mockReturnValue({})
    mockSyncProgressToDB.mockResolvedValue(undefined)
    mockFetchProgressFromAPI.mockResolvedValue([])
    _resetLoaderState()
  })

  it("returns all completed step IDs (unfiltered)", async () => {
    mockGetLocalStorageProgress.mockReturnValue({
      "s1": "completed",
      "s2": "completed",
    })

    const { result } = renderHook(() => useAllTourProgress(false), { wrapper })

    await waitFor(() => {
      expect(result.current.has("s1")).toBe(true)
    })

    expect(result.current.has("s2")).toBe(true)
    expect(result.current.size).toBe(2)
  })

  it("returns empty set when no progress exists", async () => {
    const { result } = renderHook(() => useAllTourProgress(false), { wrapper })

    await waitFor(() => {
      expect(mockGetLocalStorageProgress).toHaveBeenCalled()
    })

    expect(result.current.size).toBe(0)
  })

  it("loads authenticated progress from API", async () => {
    mockFetchProgressFromAPI.mockResolvedValue([
      { step_id: "s1", status: "completed" },
      { step_id: "s2", status: "completed" },
    ])

    const { result } = renderHook(() => useAllTourProgress(true), { wrapper })

    await waitFor(() => {
      expect(result.current.has("s1")).toBe(true)
    })

    expect(result.current.has("s2")).toBe(true)
    expect(mockSyncProgressToDB).toHaveBeenCalled()
  })

  it("re-triggers load when isLoggedIn changes", async () => {
    mockFetchProgressFromAPI.mockResolvedValue([
      { step_id: "s1", status: "completed" },
    ])

    const { rerender } = renderHook(
      ({ isLoggedIn }) => useAllTourProgress(isLoggedIn),
      { initialProps: { isLoggedIn: false }, wrapper }
    )

    await waitFor(() => {
      expect(mockGetLocalStorageProgress).toHaveBeenCalled()
    })

    rerender({ isLoggedIn: true })

    await waitFor(() => {
      expect(mockSyncProgressToDB).toHaveBeenCalled()
    })
  })
})
