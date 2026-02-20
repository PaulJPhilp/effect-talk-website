import { describe, it, expect } from "vitest"
import { Atom } from "@effect-atom/atom"
import * as Registry from "@effect-atom/atom/Registry"
import { completedStepIdsAtom, progressLoadedAtom } from "@/lib/tourAtoms"

/**
 * Tests for the tour atom definitions.
 * Loading/sync logic is tested via the hook tests.
 */

function readAtom<A>(registry: Registry.Registry, atom: Atom.Atom<A>): A {
  return registry.get(atom)
}

describe("tourAtoms", () => {
  it("completedStepIdsAtom starts with an empty Set", () => {
    const registry = Registry.make()
    const value = readAtom(registry, completedStepIdsAtom)
    expect(value).toBeInstanceOf(Set)
    expect(value.size).toBe(0)
  })

  it("progressLoadedAtom starts as false", () => {
    const registry = Registry.make()
    const value = readAtom(registry, progressLoadedAtom)
    expect(value).toBe(false)
  })

  it("completedStepIdsAtom is writable", () => {
    const registry = Registry.make()
    registry.set(completedStepIdsAtom, new Set(["step-1", "step-2"]))
    const value = readAtom(registry, completedStepIdsAtom)
    expect(value.has("step-1")).toBe(true)
    expect(value.has("step-2")).toBe(true)
    expect(value.size).toBe(2)
  })

  it("progressLoadedAtom is writable", () => {
    const registry = Registry.make()
    registry.set(progressLoadedAtom, true)
    const value = readAtom(registry, progressLoadedAtom)
    expect(value).toBe(true)
  })

  it("both atoms have keepAlive enabled", () => {
    expect(completedStepIdsAtom.keepAlive).toBe(true)
    expect(progressLoadedAtom.keepAlive).toBe(true)
  })
})
