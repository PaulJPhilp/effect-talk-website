import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const authState = {
  currentUser: null as null | { id: string },
};

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/services/Auth", () => ({
  getCurrentUser: async () => authState.currentUser,
}));

vi.mock("@/services/TourProgress", () => ({
  getAllLessonsForList: () => Effect.succeed([] as const),
}));

vi.mock("@/components/tour/TourLessonList", () => ({
  TourLessonList: () => <div>Lesson list</div>,
}));

vi.mock("@/components/tour/TourModeSwitcher", () => ({
  TourModeSwitcher: () => <div>Mode switcher</div>,
}));

vi.mock("@/components/tour/TourStartedTracker", () => ({
  TourStartedTracker: () => null,
}));

describe("TourPage", () => {
  beforeEach(() => {
    authState.currentUser = null;
    redirectMock.mockClear();
  });

  it("redirects guests who request v4 mode", async () => {
    const { default: TourPage } = await import("@/app/tour/page");

    await expect(
      TourPage({ searchParams: Promise.resolve({ mode: "v4" }) })
    ).rejects.toThrow("REDIRECT:/auth/sign-in?returnTo=%2Ftour%3Fmode%3Dv4");
  });

  it("allows guests to view the v3 tour", async () => {
    const { default: TourPage } = await import("@/app/tour/page");

    const result = await TourPage({
      searchParams: Promise.resolve({ mode: "v3" }),
    });

    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("allows logged-in users to access protected tour modes", async () => {
    authState.currentUser = { id: "user-123" };
    const { default: TourPage } = await import("@/app/tour/page");

    const result = await TourPage({
      searchParams: Promise.resolve({ mode: "compare" }),
    });

    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
