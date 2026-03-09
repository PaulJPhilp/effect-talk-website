import { Effect } from "effect"
import { redirect } from "next/navigation"
import { getAllLessonsForList } from "@/services/TourProgress"
import { getCurrentUser } from "@/services/Auth"
import { TourLessonList } from "@/components/tour/TourLessonList"
import { TourModeSwitcher } from "@/components/tour/TourModeSwitcher"
import { TourStartedTracker } from "@/components/tour/TourStartedTracker"
import { buildPathWithSearchParams } from "@/lib/authRedirect"
import { buildMetadata } from "@/lib/seo"
import { isProtectedTourMode, parseTourMode } from "@/lib/tourMode"

export const metadata = buildMetadata({
  title: "Effect.ts Tour",
  description: "Learn Effect.ts step by step through interactive lessons.",
})

export const revalidate = 300

interface TourPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TourPage({ searchParams }: TourPageProps) {
  const resolvedSearchParams = await searchParams
  const requestedMode = parseTourMode(
    typeof resolvedSearchParams.mode === "string" ? resolvedSearchParams.mode : null
  )

  const currentUser = await getCurrentUser()

  if (!currentUser && isProtectedTourMode(requestedMode)) {
    const returnTo = buildPathWithSearchParams("/tour", resolvedSearchParams)
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const lessons = await Effect.runPromise(
    getAllLessonsForList().pipe(Effect.catchAll(() => Effect.succeed([] as const)))
  )

  return (
    <>
      <TourStartedTracker />
      <div className="container px-4 md:px-6 py-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Effect.ts Tour</h1>
        <p className="text-muted-foreground mb-8">
          Learn Effect.ts step by step. Each lesson covers a core concept with
          code examples you can try in the browser.
        </p>
        <TourModeSwitcher className="mb-8" isLoggedIn={Boolean(currentUser)} />

        {lessons.length === 0 ? (
          <p className="text-muted-foreground">No lessons available yet. Check back soon!</p>
        ) : (
          <TourLessonList
            lessons={lessons}
            isLoggedIn={Boolean(currentUser)}
          />
        )}
      </div>
    </>
  )
}
