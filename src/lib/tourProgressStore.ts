import { getLocalStorageProgress, setLocalStorageStepCompleted, syncProgressToDB } from "@/lib/tourProgressSync"

interface TourProgressApiItem {
  readonly step_id: string
  readonly status: "not_started" | "completed" | "skipped"
}

type ProgressAudience = "guest" | "authenticated"

const store = {
  completedStepIds: new Set<string>(),
  listeners: new Set<() => void>(),
  loadedAudiences: new Set<ProgressAudience>(),
  inFlightAudience: null as ProgressAudience | null,
  inFlightPromise: null as Promise<void> | null,
  hasSyncedAuthenticatedSession: false,
}

function notifyListeners(): void {
  for (const listener of store.listeners) {
    listener()
  }
}

function setCompletedStepIds(stepIds: ReadonlySet<string>): void {
  store.completedStepIds = new Set(stepIds)
  notifyListeners()
}

function audienceFromAuth(isLoggedIn: boolean): ProgressAudience {
  return isLoggedIn ? "authenticated" : "guest"
}

export function subscribeTourProgress(listener: () => void): () => void {
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
  }
}

export function getTourProgressSnapshot(): ReadonlySet<string> {
  return store.completedStepIds
}

export async function ensureTourProgressLoaded(isLoggedIn: boolean): Promise<void> {
  const audience = audienceFromAuth(isLoggedIn)
  if (isLoggedIn && store.loadedAudiences.has(audience)) {
    return
  }

  if (store.inFlightPromise && store.inFlightAudience === audience) {
    await store.inFlightPromise
    return
  }

  const loadPromise = (async () => {
    if (!isLoggedIn) {
      const local = getLocalStorageProgress()
      const completed = new Set<string>()
      for (const [stepId, status] of Object.entries(local)) {
        if (status === "completed") {
          completed.add(stepId)
        }
      }
      setCompletedStepIds(completed)
      store.loadedAudiences.add("guest")
      return
    }

    if (!store.hasSyncedAuthenticatedSession) {
      await syncProgressToDB()
      store.hasSyncedAuthenticatedSession = true
    }

    const response = await fetch("/api/tour/progress", { method: "GET" })
    if (!response.ok) {
      setCompletedStepIds(new Set())
      store.loadedAudiences.add("authenticated")
      return
    }

    const payload = await response.json() as {
      readonly progress?: readonly TourProgressApiItem[]
    }
    const completed = new Set<string>()
    for (const item of payload.progress ?? []) {
      if (item.status === "completed") {
        completed.add(item.step_id)
      }
    }
    setCompletedStepIds(completed)
    store.loadedAudiences.add("authenticated")
  })().finally(() => {
    if (store.inFlightAudience === audience) {
      store.inFlightAudience = null
      store.inFlightPromise = null
    }
  })

  store.inFlightAudience = audience
  store.inFlightPromise = loadPromise
  await loadPromise
}

export function markTourStepCompletedLocally(stepId: string, isLoggedIn: boolean): void {
  if (store.completedStepIds.has(stepId)) {
    return
  }

  const next = new Set(store.completedStepIds)
  next.add(stepId)
  setCompletedStepIds(next)

  if (!isLoggedIn) {
    setLocalStorageStepCompleted(stepId)
  }
}

export async function persistTourStepCompleted(stepId: string): Promise<void> {
  await fetch("/api/tour/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stepId,
      status: "completed",
    }),
  })
}

export async function primeTourAuthenticatedSync(): Promise<void> {
  if (store.hasSyncedAuthenticatedSession) {
    return
  }
  await syncProgressToDB()
  store.hasSyncedAuthenticatedSession = true
}
