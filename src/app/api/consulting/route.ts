import { type NextRequest, NextResponse } from "next/server"
import { Effect, Schema, Either } from "effect"
import { insertConsultingInquiry } from "@/services/Db"
import { sendConsultingConfirmation } from "@/services/Email"
import { trackEvent } from "@/services/Analytics"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { formatSchemaErrors } from "@/lib/schema"

const ConsultingSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Name is required" })
  ),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => "Invalid email address",
    })
  ),
  role: Schema.optional(Schema.String),
  company: Schema.optional(Schema.String),
  description: Schema.String.pipe(
    Schema.minLength(10, { message: () => "Please provide more detail about your project" })
  ),
})

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"
  const rateCheck = await checkRateLimit(`consulting:${ip}`, RATE_LIMITS.form)
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

  const decoded = Schema.decodeUnknownEither(ConsultingSchema)(body)
  if (Either.isLeft(decoded)) {
    return NextResponse.json(
      { error: "Validation failed", details: formatSchemaErrors(decoded.left) },
      { status: 400 }
    )
  }

  const { name, email, role, company, description } = decoded.right

  try {
    // Insert into DB
    await Effect.runPromise(
      insertConsultingInquiry({ name, email, role, company, description })
    )

    // Send confirmation email (fire and forget)
    Effect.runPromise(
      sendConsultingConfirmation(email, name).pipe(
        Effect.catchAll((e) => Effect.logWarning(`Email send failed: ${e.message}`))
      )
    ).catch(() => {
      // Silently ignore
    })

    // Track analytics (fire and forget)
    Effect.runPromise(
      trackEvent({ type: "consulting_submitted" })
    ).catch(() => {
      // Silently ignore
    })

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders })
  } catch (error) {
    console.error("Consulting inquiry error:", error)
    return NextResponse.json(
      { error: "Failed to process inquiry. Please try again." },
      { status: 500, headers: rateLimitHeaders }
    )
  }
}
