export const TOUR_MODE_VALUES = ["v3", "v4", "compare"] as const

export type TourMode = (typeof TOUR_MODE_VALUES)[number]

export interface TourModeOption {
  readonly value: TourMode
  readonly label: string
}

export const TOUR_MODE_OPTIONS: readonly TourModeOption[] = [
  { value: "v3", label: "v3" },
  { value: "v4", label: "v4" },
  { value: "compare", label: "v3 ↔ v4" },
] as const

type SearchParamsLike =
  | URLSearchParams
  | Readonly<{ toString(): string }>
  | string
  | null
  | undefined

export function parseTourMode(value: string | null | undefined): TourMode {
  return value === "v4" || value === "compare" || value === "v3" ? value : "v3"
}

export function isTourModeAvailable(mode: TourMode, isLoggedIn: boolean): boolean {
  return isLoggedIn || mode === "v3"
}

export function isProtectedTourMode(mode: TourMode): boolean {
  return mode === "v4" || mode === "compare"
}

export function getAccessibleTourMode(value: string | null | undefined, isLoggedIn: boolean): TourMode {
  const parsed = parseTourMode(value)
  return isTourModeAvailable(parsed, isLoggedIn) ? parsed : "v3"
}

export function cloneSearchParams(searchParams?: SearchParamsLike): URLSearchParams {
  if (searchParams == null) {
    return new URLSearchParams()
  }

  if (typeof searchParams === "string") {
    return new URLSearchParams(searchParams)
  }

  return new URLSearchParams(searchParams.toString())
}

export function buildTourHref(
  pathname: string,
  searchParams?: SearchParamsLike,
  updates?: {
    readonly mode?: TourMode
    readonly step?: number | null
  }
): string {
  const next = cloneSearchParams(searchParams)

  if (updates?.mode != null) {
    next.set("mode", updates.mode)
  }

  if (updates?.step === null) {
    next.delete("step")
  } else if (updates?.step != null) {
    next.set("step", String(updates.step))
  }

  const query = next.toString()
  return query.length > 0 ? `${pathname}?${query}` : pathname
}
