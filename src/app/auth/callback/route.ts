import { type NextRequest, NextResponse } from "next/server"
import { Effect } from "effect"
import { handleCallback } from "@/services/Auth"

/**
 * WorkOS OAuth callback handler.
 * Exchanges the authorization code for user info, upserts the user, and sets session.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"

  if (!code) {
    return NextResponse.redirect(`${appBaseUrl}/auth/sign-in?error=missing_code`)
  }

  try {
    await Effect.runPromise(handleCallback(code))
    return NextResponse.redirect(`${appBaseUrl}/settings`)
  } catch (error) {
    console.error("Auth callback error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error details:", errorMessage)
    return NextResponse.redirect(`${appBaseUrl}/auth/sign-in?error=auth_failed&details=${encodeURIComponent(errorMessage)}`)
  }
}
