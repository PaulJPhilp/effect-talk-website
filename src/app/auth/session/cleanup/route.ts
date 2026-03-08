import { type NextRequest, NextResponse } from "next/server"
import { clearSessionCookie } from "@/services/Auth"
import { getSafeReturnPath } from "@/lib/authRedirect"

/**
 * Clears the custom session cookie and redirects to a safe return path.
 * Useful for recovering from stale/invalid local session state.
 */
export async function GET(request: NextRequest) {
  await clearSessionCookie()
  const returnPath = getSafeReturnPath(request.nextUrl.searchParams.get("returnTo"))
  return NextResponse.redirect(new URL(returnPath, request.nextUrl.origin))
}
