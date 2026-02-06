import { type NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { getSessionUserId } from "@/services/Auth"
import { getUserByWorkosId } from "@/services/Db"
import { revokeUserApiKey } from "@/services/ApiKeys"

/**
 * POST /api/api-keys/[id] - Revoke an API key.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const workosId = await getSessionUserId()
  if (!workosId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: keyId } = await params

  try {
    const user = await Effect.runPromise(
      getUserByWorkosId(workosId).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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
