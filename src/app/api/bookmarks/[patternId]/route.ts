import { NextResponse } from "next/server"
import { Effect } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { removeBookmark } from "@/services/Bookmarks"

/**
 * DELETE /api/bookmarks/[patternId] - Remove a bookmark for a pattern.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ patternId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { patternId } = await params

  try {
    await Effect.runPromise(
      removeBookmark(user.id, patternId).pipe(
        Effect.catchAll(() => Effect.void)
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove bookmark error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
