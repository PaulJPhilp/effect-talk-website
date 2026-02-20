import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { bulkUpsertBookmarks } from "@/services/Bookmarks"
import { formatSchemaErrors } from "@/lib/schema"

const BulkSyncSchema = Schema.Struct({
  patternIds: Schema.Array(Schema.String),
})

/**
 * POST /api/bookmarks/sync - Bulk sync bookmarks from localStorage (guest to sovereign).
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
    await Effect.runPromise(
      bulkUpsertBookmarks(user.id, decoded.right.patternIds).pipe(
        Effect.catchAll(() => Effect.void)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Sync bookmarks error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
