import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getSessionUserId } from "@/services/Auth"
import { getUserByWorkosId } from "@/services/Db"
import { createApiKey, listUserApiKeys } from "@/services/ApiKeys"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { formatSchemaErrors } from "@/lib/schema"

/**
 * GET /api/api-keys - List all API keys for the current user.
 */
export async function GET() {
  const workosId = await getSessionUserId()
  if (!workosId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await Effect.runPromise(
      getUserByWorkosId(workosId).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const keys = await Effect.runPromise(
      listUserApiKeys(user.id).pipe(
        Effect.catchAll(() => Effect.succeed([] as const))
      )
    )

    // Strip key_hash from response
    const safeKeys = keys.map(({ key_hash: _, ...rest }) => rest)

    return NextResponse.json({ keys: safeKeys })
  } catch (error) {
    console.error("List API keys error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

const CreateKeySchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Key name is required" }),
    Schema.maxLength(100)
  ),
})

/**
 * POST /api/api-keys - Create a new API key.
 */
export async function POST(request: NextRequest) {
  const workosId = await getSessionUserId()
  if (!workosId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit
  const rateCheck = checkRateLimit(`api-keys:${workosId}`, RATE_LIMITS.apiKey)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const decoded = Schema.decodeUnknownEither(CreateKeySchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  try {
    const user = await Effect.runPromise(
      getUserByWorkosId(workosId).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const result = await Effect.runPromise(
      createApiKey(user.id, decoded.right.name)
    )

    return NextResponse.json({
      plaintext: result.plaintext,
      key: {
        id: result.record.id,
        name: result.record.name,
        key_prefix: result.record.key_prefix,
        created_at: result.record.created_at,
      },
    })
  } catch (error) {
    console.error("Create API key error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
