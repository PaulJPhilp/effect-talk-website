import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { updateUserPreferences } from "@/services/Db"
import { formatSchemaErrors } from "@/lib/schema"

const PreferencesSchema = Schema.Struct({
  preferences: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
})

/**
 * POST /api/preferences - Update user preferences.
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

  const decoded = Schema.decodeUnknownEither(PreferencesSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    const updated = await Effect.runPromise(
      updateUserPreferences(user.id, decoded.right.preferences as Record<string, unknown>).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error("Preferences update error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
