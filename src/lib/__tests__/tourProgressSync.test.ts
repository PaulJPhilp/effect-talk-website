import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getLocalStorageProgress,
  setLocalStorageStepCompleted,
  clearLocalStorageProgress,
  syncProgressToDB,
  fetchProgressFromAPI,
  persistStepCompleted,
} from "@/lib/tourProgressSync"

describe("tourProgressSync", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("getLocalStorageProgress", () => {
    it("returns empty object when nothing stored", () => {
      expect(getLocalStorageProgress()).toEqual({})
    })

    it("returns parsed progress from localStorage", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed", "step-2": "skipped" })
      )
      expect(getLocalStorageProgress()).toEqual({
        "step-1": "completed",
        "step-2": "skipped",
      })
    })

    it("returns empty object when localStorage contains invalid JSON", () => {
      localStorage.setItem("tour_progress", "not-json")
      expect(getLocalStorageProgress()).toEqual({})
    })
  })

  describe("setLocalStorageStepCompleted", () => {
    it("sets a step as completed in localStorage", () => {
      setLocalStorageStepCompleted("step-1")
      const stored = JSON.parse(localStorage.getItem("tour_progress")!)
      expect(stored).toEqual({ "step-1": "completed" })
    })

    it("preserves existing progress", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" })
      )
      setLocalStorageStepCompleted("step-2")
      const stored = JSON.parse(localStorage.getItem("tour_progress")!)
      expect(stored).toEqual({
        "step-1": "completed",
        "step-2": "completed",
      })
    })

    it("overwrites existing status for the same step", () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "skipped" })
      )
      setLocalStorageStepCompleted("step-1")
      const stored = JSON.parse(localStorage.getItem("tour_progress")!)
      expect(stored).toEqual({ "step-1": "completed" })
    })
  })

  describe("clearLocalStorageProgress", () => {
    it("removes progress from localStorage", () => {
      localStorage.setItem("tour_progress", JSON.stringify({ "step-1": "completed" }))
      clearLocalStorageProgress()
      expect(localStorage.getItem("tour_progress")).toBeNull()
    })

    it("does not throw when nothing stored", () => {
      expect(() => clearLocalStorageProgress()).not.toThrow()
    })
  })

  describe("syncProgressToDB", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("does nothing when localStorage is empty", async () => {
      await syncProgressToDB()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("sends localStorage progress to sync endpoint", async () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed", "step-2": "skipped" })
      )

      await syncProgressToDB()

      expect(fetchSpy).toHaveBeenCalledWith("/api/tour/progress/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: [
            { stepId: "step-1", status: "completed" },
            { stepId: "step-2", status: "skipped" },
          ],
        }),
      })
    })

    it("keeps localStorage after successful sync (idempotent re-sync is safe)", async () => {
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" })
      )

      await syncProgressToDB()

      expect(localStorage.getItem("tour_progress")).not.toBeNull()
    })

    it("keeps localStorage when sync fails", async () => {
      fetchSpy.mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      )
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" })
      )

      await syncProgressToDB()

      expect(localStorage.getItem("tour_progress")).not.toBeNull()
    })

    it("keeps localStorage when fetch throws", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"))
      localStorage.setItem(
        "tour_progress",
        JSON.stringify({ "step-1": "completed" })
      )

      await syncProgressToDB()

      expect(localStorage.getItem("tour_progress")).not.toBeNull()
    })
  })

  describe("fetchProgressFromAPI", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ progress: [] }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("fetches progress from the API", async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            progress: [
              { step_id: "step-1", status: "completed" },
              { step_id: "step-2", status: "not_started" },
            ],
          }),
          { status: 200 }
        )
      )

      const result = await fetchProgressFromAPI()

      expect(fetchSpy).toHaveBeenCalledWith("/api/tour/progress", { method: "GET" })
      expect(result).toEqual([
        { step_id: "step-1", status: "completed" },
        { step_id: "step-2", status: "not_started" },
      ])
    })

    it("returns empty array on non-OK response", async () => {
      fetchSpy.mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      )

      const result = await fetchProgressFromAPI()
      expect(result).toEqual([])
    })

    it("returns empty array when response has no progress field", async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      )

      const result = await fetchProgressFromAPI()
      expect(result).toEqual([])
    })
  })

  describe("persistStepCompleted", () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it("sends POST to API with step ID and status", async () => {
      await persistStepCompleted("step-1")

      expect(fetchSpy).toHaveBeenCalledWith("/api/tour/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: "step-1", status: "completed" }),
      })
    })
  })
})
