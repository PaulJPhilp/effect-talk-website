import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { updateUserProfile } from "@/services/Db"
import { formatSchemaErrors } from "@/lib/schema"

const ProfileUpdateSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  email: Schema.optional(
    Schema.String.pipe(
      Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
        message: () => "Invalid email address",
      })
    )
  ),
})

/**
 * POST /api/profile - Update user profile fields.
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

  const decoded = Schema.decodeUnknownEither(ProfileUpdateSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    const updated = await Effect.runPromise(
      updateUserProfile(user.id, decoded.right).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
