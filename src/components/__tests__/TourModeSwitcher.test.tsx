import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TourModeSwitcher } from "@/components/tour/TourModeSwitcher";

const navigationState = {
  pathname: "/tour/structured-concurrency",
  searchParams: new URLSearchParams("step=2&mode=v4"),
};

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}));

describe("TourModeSwitcher", () => {
  beforeEach(() => {
    navigationState.pathname = "/tour/structured-concurrency";
    navigationState.searchParams = new URLSearchParams("step=2&mode=v4");
  });

  it("marks the active mode from the URL", () => {
    render(<TourModeSwitcher isLoggedIn={true} />);

    expect(screen.getByRole("link", { name: "v4" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "v3" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("preserves existing params when generating mode links", () => {
    render(<TourModeSwitcher isLoggedIn={true} />);

    expect(screen.getByRole("link", { name: "v3" }).getAttribute("href")).toBe(
      "/tour/structured-concurrency?step=2&mode=v3"
    );
    expect(
      screen.getByRole("link", { name: "v3 ↔ v4" }).getAttribute("href")
    ).toBe("/tour/structured-concurrency?step=2&mode=compare");
  });

  it("renders v4 controls as disabled buttons for guests", () => {
    render(<TourModeSwitcher isLoggedIn={false} />);

    expect(screen.getByRole("link", { name: "v3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "v4" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "v3 ↔ v4" })).toBeDisabled();
  });
});
