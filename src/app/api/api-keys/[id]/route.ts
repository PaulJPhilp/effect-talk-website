import { type NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { revokeUserApiKey } from "@/services/ApiKeys"

/**
 * POST /api/api-keys/[id] - Revoke an API key.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: keyId } = await params

  try {
    const revoked = await Effect.runPromise(
      revokeUserApiKey(keyId, user.id).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    if (!revoked) {
      return NextResponse.json(
        { error: "Key not found or already revoked" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Revoke API key error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
