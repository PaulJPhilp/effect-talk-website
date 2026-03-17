import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

describe("Card primitives", () => {
  it("renders all card slots", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(container.querySelector("[data-slot='card']")).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='card-header']")
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-slot='card-title']")
    ).toHaveTextContent("Title");
    expect(
      container.querySelector("[data-slot='card-description']")
    ).toHaveTextContent("Description");
    expect(
      container.querySelector("[data-slot='card-action']")
    ).toHaveTextContent("Action");
    expect(
      container.querySelector("[data-slot='card-content']")
    ).toHaveTextContent("Content");
    expect(
      container.querySelector("[data-slot='card-footer']")
    ).toHaveTextContent("Footer");
    expect(screen.getByText("Title")).toBeInTheDocument();
  });
});
