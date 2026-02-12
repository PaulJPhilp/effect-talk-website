import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { getUserProgress, upsertStepProgress } from "@/services/TourProgress"
import { formatSchemaErrors } from "@/lib/schema"

const UpdateProgressSchema = Schema.Struct({
  stepId: Schema.String,
  status: Schema.Literal("not_started", "completed", "skipped"),
  feedback: Schema.optional(Schema.String),
})

/**
 * GET /api/tour/progress - Get all progress for the current user.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const progress = await Effect.runPromise(
      getUserProgress(user.id).pipe(Effect.catchAll(() => Effect.succeed([] as const)))
    )

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Get progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

/**
 * POST /api/tour/progress - Update progress for a single step.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const decoded = Schema.decodeUnknownEither(UpdateProgressSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    const updated = await Effect.runPromise(
      upsertStepProgress(user.id, decoded.right.stepId, decoded.right.status, decoded.right.feedback).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    if (!updated) {
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
    }

    return NextResponse.json({ success: true, progress: updated })
  } catch (error) {
    console.error("Update progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
