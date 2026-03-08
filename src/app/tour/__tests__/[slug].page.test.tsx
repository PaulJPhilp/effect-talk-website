import { describe, expect, it, beforeEach, vi } from "vitest"
import { Effect } from "effect"

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND")
})

const authState = {
  currentUser: null as null | { id: string },
}

const lesson = {
  id: "lesson-1",
  slug: "pipes-and-flow",
  title: "Pipes and flow",
  description: "Compose Effects in sequence.",
  order_index: 1,
  group: "Fundamentals",
  difficulty: "beginner",
  estimated_minutes: 10,
  created_at: "2026-03-07T00:00:00.000Z",
  steps: [],
}

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}))

vi.mock("@/services/Auth", () => ({
  getCurrentUser: async () => authState.currentUser,
}))

vi.mock("@/services/TourProgress", () => ({
  getLessonWithSteps: () => Effect.succeed(lesson),
}))

vi.mock("@/components/tour/TourLessonView", () => ({
  TourLessonView: () => <div>Lesson view</div>,
}))

describe("LessonPage", () => {
  beforeEach(() => {
    authState.currentUser = null
    redirectMock.mockClear()
    notFoundMock.mockClear()
  })

  it("redirects guests who request compare mode", async () => {
    const { default: LessonPage } = await import("@/app/tour/[slug]/page")

    await expect(
      LessonPage({
        params: Promise.resolve({ slug: "pipes-and-flow" }),
        searchParams: Promise.resolve({ mode: "compare", step: "2" }),
      })
    ).rejects.toThrow(
      "REDIRECT:/auth/sign-in?returnTo=%2Ftour%2Fpipes-and-flow%3Fmode%3Dcompare%26step%3D2"
    )
  })

  it("allows logged-in users to access protected lesson modes", async () => {
    authState.currentUser = { id: "user-123" }
    const { default: LessonPage } = await import("@/app/tour/[slug]/page")

    const result = await LessonPage({
      params: Promise.resolve({ slug: "pipes-and-flow" }),
      searchParams: Promise.resolve({ mode: "v4", step: "1" }),
    })

    expect(result).toBeTruthy()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
