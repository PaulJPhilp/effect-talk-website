import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { insertWaitlistSignup } from "@/services/Db"
import { sendWaitlistConfirmation } from "@/services/Email"
import { trackEvent } from "@/services/Analytics"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { formatSchemaErrors } from "@/lib/schema"

const WaitlistSchema = Schema.Struct({
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Invalid email address",
    })
  ),
  roleOrCompany: Schema.optional(Schema.String),
  source: Schema.Literal("playground", "code_review"),
})

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const rateCheck = await checkRateLimit(`waitlist:${ip}`, RATE_LIMITS.form)
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMITS.form.maxRequests),
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

  // Parse and validate
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const decoded = Schema.decodeUnknownEither(WaitlistSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  const { email, roleOrCompany, source } = decoded.right

  try {
    // Insert into DB
    await Effect.runPromise(insertWaitlistSignup(email, source, roleOrCompany))

    // Send confirmation email (fire and forget)
    Effect.runPromise(
      sendWaitlistConfirmation(email, source).pipe(
        Effect.catchAll((e) => Effect.logWarning(`Email send failed: ${e.message}`))
      )
    ).catch(() => {
      // Silently ignore
    })

    // Track analytics (fire and forget)
    Effect.runPromise(
      trackEvent({ type: "waitlist_submitted", source })
    ).catch(() => {
      // Silently ignore
    })

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders })
  } catch (error) {
    console.error("Waitlist signup error:", error)
    return NextResponse.json(
      { error: "Failed to process signup. Please try again." },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
