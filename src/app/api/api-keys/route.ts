import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { getCurrentUser } from "@/services/Auth"
import { createApiKey, listUserApiKeys } from "@/services/ApiKeys"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { formatSchemaErrors } from "@/lib/schema"

/**
 * GET /api/api-keys - List all API keys for the current user.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const keys = await Effect.runPromise(
      listUserApiKeys(user.id).pipe(
        Effect.catchAll(() => Effect.succeed([] as const))
      )
    )

    // Strip key_hash from response
    const safeKeys = keys.map((key) => {
      const { key_hash, ...rest } = key
      void key_hash
      return rest
    })

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
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit
  const rateCheck = await checkRateLimit(`api-keys:${user.id}`, RATE_LIMITS.apiKey)
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMITS.apiKey.maxRequests),
    "X-RateLimit-Remaining": String(rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
  }
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(retryAfterSeconds),
        },
      }
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
      { status: 400, headers: rateLimitHeaders }
    )
  }

  try {
    const result = await Effect.runPromise(
      createApiKey(user.id, decoded.right.name)
    )

    return NextResponse.json(
      {
        plaintext: result.plaintext,
        key: {
          id: result.record.id,
          name: result.record.name,
          key_prefix: result.record.key_prefix,
          created_at: result.record.created_at,
        },
      },
      { headers: rateLimitHeaders }
    )
  } catch (error) {
    console.error("Create API key error:", error)
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
