/**
 * Minimal render tests for FeedbackForm (no submit, no network).
 * useRouter is stubbed so the component mounts; we do not assert on navigation or fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { FeedbackForm } from "@/components/FeedbackForm"
import { createTypedFakeFetch } from "@/test/fakeFetch"

const routerPushMock = vi.fn()
// Exception: next/navigation mock required — Next.js provides no test router.
// These stubs return valid shapes only; no call-verification assertions.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
}))

describe("FeedbackForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const originalFetch = globalThis.fetch
    vi.stubGlobal("fetch", createTypedFakeFetch({
      originalFetch,
      handler: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders form with name, email, and message fields and submit button", () => {
    render(<FeedbackForm />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message \*/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument()
  })

  it("renders card title when not embedded", () => {
    const { container } = render(<FeedbackForm />)
    const cardTitle = container.querySelector("[data-slot=card-title]")
    expect(cardTitle).toBeInTheDocument()
    expect(cardTitle).toHaveTextContent("Send Feedback")
  })

  it("renders without card wrapper when embedded", () => {
    render(<FeedbackForm embedded />)
    expect(screen.queryByRole("heading", { name: /send feedback/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument()
  })

  it("email and message inputs are required", () => {
    render(<FeedbackForm />)
    const email = screen.getByLabelText(/email \*/i)
    const message = screen.getByLabelText(/message \*/i)
    expect(email).toBeRequired()
    expect(message).toBeRequired()
  })

  it("redirects to /thanks after a successful submit", async () => {
    render(<FeedbackForm />)

    fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: "user@example.com" } })
    fireEvent.change(screen.getByLabelText(/message \*/i), { target: { value: "Valid feedback message" } })
    fireEvent.submit(screen.getByRole("button", { name: /send feedback/i }).closest("form")!)

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith("/thanks")
    })
  })

  it("calls onSuccess instead of redirecting when provided", async () => {
    const onSuccess = vi.fn()
    render(<FeedbackForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: "user@example.com" } })
    fireEvent.change(screen.getByLabelText(/message \*/i), { target: { value: "Valid feedback message" } })
    fireEvent.submit(screen.getByRole("button", { name: /send feedback/i }).closest("form")!)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("shows the server error and resets the submit button when the request fails", async () => {
    vi.stubGlobal("fetch", createTypedFakeFetch({
      originalFetch: globalThis.fetch,
      handler: async () => new Response(JSON.stringify({ error: "Bad feedback" }), { status: 400 }),
    }))

    render(<FeedbackForm />)

    fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: "user@example.com" } })
    fireEvent.change(screen.getByLabelText(/message \*/i), { target: { value: "Valid feedback message" } })
    fireEvent.submit(screen.getByRole("button", { name: /send feedback/i }).closest("form")!)

    await waitFor(() => {
      expect(screen.getByText("Bad feedback")).toBeInTheDocument()
    })
    expect(screen.getByRole("button")).toHaveTextContent("Send Feedback")
  })
})
