import { Effect } from "effect";
import { redirect } from "next/navigation";
import { TourLessonList } from "@/components/tour/TourLessonList";
import { TourModeSwitcher } from "@/components/tour/TourModeSwitcher";
import { TourStartedTracker } from "@/components/tour/TourStartedTracker";
import { buildPathWithSearchParams } from "@/lib/authRedirect";
import { buildMetadata } from "@/lib/seo";
import { isProtectedTourMode, parseTourMode } from "@/lib/tourMode";
import { getCurrentUser } from "@/services/Auth";
import { getAllLessonsForList } from "@/services/TourProgress";

export const metadata = buildMetadata({
  title: "Effect.ts Tour",
  description: "Learn Effect.ts step by step through interactive lessons.",
});

export const revalidate = 300;

interface TourPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TourPage({ searchParams }: TourPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedMode = parseTourMode(
    typeof resolvedSearchParams.mode === "string"
      ? resolvedSearchParams.mode
      : null
  );

  const currentUser = await getCurrentUser();

  if (!currentUser && isProtectedTourMode(requestedMode)) {
    const returnTo = buildPathWithSearchParams("/tour", resolvedSearchParams);
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const lessons = await Effect.runPromise(
    getAllLessonsForList().pipe(
      Effect.catchAll(() => Effect.succeed([] as const))
    )
  );

  return (
    <>
      <TourStartedTracker />
      <div className="container max-w-2xl px-4 py-10 md:px-6">
        <h1 className="mb-2 font-bold text-3xl tracking-tight">
          Effect.ts Tour
        </h1>
        <p className="mb-8 text-muted-foreground">
          Learn Effect.ts step by step. Each lesson covers a core concept with
          code examples you can try in the browser.
        </p>
        <TourModeSwitcher className="mb-8" isLoggedIn={Boolean(currentUser)} />

        {lessons.length === 0 ? (
          <p className="text-muted-foreground">
            No lessons available yet. Check back soon!
          </p>
        ) : (
          <TourLessonList isLoggedIn={Boolean(currentUser)} lessons={lessons} />
        )}
      </div>
    </>
  );
}
