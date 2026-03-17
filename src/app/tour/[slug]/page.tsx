import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { TourLessonView } from "@/components/tour/TourLessonView";
import { buildPathWithSearchParams } from "@/lib/authRedirect";
import { buildMetadata } from "@/lib/seo";
import { isProtectedTourMode, parseTourMode } from "@/lib/tourMode";
import { getCurrentUser } from "@/services/Auth";
import { getLessonWithSteps } from "@/services/TourProgress";

/**
 * ISR: revalidate lesson pages every 5 minutes.
 */
export const revalidate = 300;

interface LessonPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const getLessonWithStepsCached = cache(async (slug: string) => {
  return Effect.runPromise(
    getLessonWithSteps(slug).pipe(Effect.catchAll(() => Effect.succeed(null)))
  );
});

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonWithStepsCached(slug);

  if (!lesson) {
    return buildMetadata({ title: "Lesson Not Found" });
  }

  return buildMetadata({
    title: lesson.title,
    description: lesson.description,
  });
}

export default async function LessonPage({
  params,
  searchParams,
}: LessonPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const requestedMode = parseTourMode(
    typeof resolvedSearchParams.mode === "string"
      ? resolvedSearchParams.mode
      : null
  );

  const [lesson, currentUser] = await Promise.all([
    getLessonWithStepsCached(slug),
    getCurrentUser(),
  ]);

  if (!currentUser && isProtectedTourMode(requestedMode)) {
    const returnTo = buildPathWithSearchParams(
      `/tour/${slug}`,
      resolvedSearchParams
    );
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  if (!lesson) {
    notFound();
  }

  return <TourLessonView isLoggedIn={Boolean(currentUser)} lesson={lesson} />;
}
