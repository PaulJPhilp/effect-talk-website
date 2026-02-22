import { describe, it, expect, beforeEach } from "vitest"
import { getLastStepForLesson, setLastStepForLesson } from "@/lib/tourPosition"

describe("tourPosition", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("getLastStepForLesson", () => {
    it("returns null when nothing stored", () => {
      expect(getLastStepForLesson("pipes-and-flow")).toBeNull()
    })

    it("returns stored step index", () => {
      localStorage.setItem(
        "tour_last_step",
        JSON.stringify({ "pipes-and-flow": 3 })
      )
      expect(getLastStepForLesson("pipes-and-flow")).toBe(3)
    })

    it("returns null for a different lesson slug", () => {
      localStorage.setItem(
        "tour_last_step",
        JSON.stringify({ "pipes-and-flow": 3 })
      )
      expect(getLastStepForLesson("error-handling")).toBeNull()
    })

    it("returns null when step is 0 (invalid — steps start at 1)", () => {
      localStorage.setItem(
        "tour_last_step",
        JSON.stringify({ "pipes-and-flow": 0 })
      )
      expect(getLastStepForLesson("pipes-and-flow")).toBeNull()
    })

    it("returns null when step is not an integer", () => {
      localStorage.setItem(
        "tour_last_step",
        JSON.stringify({ "pipes-and-flow": 2.5 })
      )
      expect(getLastStepForLesson("pipes-and-flow")).toBeNull()
    })

    it("returns null when value is not a number", () => {
      localStorage.setItem(
        "tour_last_step",
        JSON.stringify({ "pipes-and-flow": "three" })
      )
      expect(getLastStepForLesson("pipes-and-flow")).toBeNull()
    })

    it("returns null when stored JSON is invalid", () => {
      localStorage.setItem("tour_last_step", "bad-json")
      expect(getLastStepForLesson("pipes-and-flow")).toBeNull()
    })
  })

  describe("setLastStepForLesson", () => {
    it("persists step index for a lesson", () => {
      setLastStepForLesson("pipes-and-flow", 2)
      const stored = JSON.parse(localStorage.getItem("tour_last_step")!)
      expect(stored["pipes-and-flow"]).toBe(2)
    })

    it("preserves other lessons when setting a new one", () => {
      setLastStepForLesson("pipes-and-flow", 2)
      setLastStepForLesson("error-handling", 5)
      const stored = JSON.parse(localStorage.getItem("tour_last_step")!)
      expect(stored).toEqual({
        "pipes-and-flow": 2,
        "error-handling": 5,
      })
    })

    it("overwrites previous step index for same lesson", () => {
      setLastStepForLesson("pipes-and-flow", 2)
      setLastStepForLesson("pipes-and-flow", 4)
      const stored = JSON.parse(localStorage.getItem("tour_last_step")!)
      expect(stored["pipes-and-flow"]).toBe(4)
    })
  })
})
