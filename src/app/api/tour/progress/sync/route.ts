import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { bulkUpsertProgress, type TourProgressStatus } from "@/services/TourProgress"
import { formatSchemaErrors } from "@/lib/schema"

const BulkSyncSchema = Schema.Struct({
  progress: Schema.Array(
    Schema.Struct({
      stepId: Schema.String,
      status: Schema.Literal("not_started", "completed", "skipped"),
    })
  ),
})

/**
 * POST /api/tour/progress/sync - Bulk sync progress from localStorage (guest to sovereign).
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

  const decoded = Schema.decodeUnknownEither(BulkSyncSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    const synced = await Effect.runPromise(
      bulkUpsertProgress(
        user.id,
        decoded.right.progress.map((p) => ({
          stepId: p.stepId,
          status: p.status as TourProgressStatus,
        }))
      ).pipe(Effect.catchAll(() => Effect.succeed([] as const)))
    )

    return NextResponse.json({ success: true, progress: synced })
  } catch (error) {
    console.error("Sync progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
