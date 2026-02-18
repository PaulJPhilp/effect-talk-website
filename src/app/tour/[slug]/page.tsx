import { Effect } from "effect"
import { notFound } from "next/navigation"
import { cache } from "react"
import { getLessonWithSteps } from "@/services/TourProgress"
import { getCurrentUser } from "@/services/Auth"
import { TourLessonView } from "@/components/tour/TourLessonView"
import { buildMetadata } from "@/lib/seo"
import type { Metadata } from "next"

/**
 * ISR: revalidate lesson pages every 5 minutes.
 */
export const revalidate = 300

interface LessonPageProps {
  params: Promise<{ slug: string }>
}

const getLessonWithStepsCached = cache(async (slug: string) => {
  return Effect.runPromise(
    getLessonWithSteps(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  )
})

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { slug } = await params
  const lesson = await getLessonWithStepsCached(slug)

  if (!lesson) {
    return buildMetadata({ title: "Lesson Not Found" })
  }

  return buildMetadata({
    title: lesson.title,
    description: lesson.description,
  })
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params

  const [lesson, currentUser] = await Promise.all([
    getLessonWithStepsCached(slug),
    getCurrentUser(),
  ])

  if (!lesson) {
    notFound()
  }

  return <TourLessonView lesson={lesson} isLoggedIn={Boolean(currentUser)} />
}
