import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/services/Auth"

/**
 * Sign out: clear session cookie and redirect to home.
 */
export async function GET() {
  await clearSessionCookie()
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000"
  return NextResponse.redirect(appBaseUrl)
}
