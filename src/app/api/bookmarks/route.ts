import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { getUserBookmarks, addBookmark } from "@/services/Bookmarks"
import { formatSchemaErrors } from "@/lib/schema"

const AddBookmarkSchema = Schema.Struct({
  patternId: Schema.String,
})

/**
 * GET /api/bookmarks - Get all bookmarked pattern IDs for the current user.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const bookmarks = await Effect.runPromise(
      getUserBookmarks(user.id).pipe(Effect.catchAll(() => Effect.succeed([] as string[])))
    )

    return NextResponse.json({ bookmarks })
  } catch (error) {
    console.error("Get bookmarks error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

/**
 * POST /api/bookmarks - Add a bookmark for a pattern.
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

  const decoded = Schema.decodeUnknownEither(AddBookmarkSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    await Effect.runPromise(
      addBookmark(user.id, decoded.right.patternId).pipe(
        Effect.catchAll(() => Effect.void)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Add bookmark error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
