import { authkitMiddleware } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** Inline check so we never import @/lib/env from middleware (avoids build-time validation). */
function isWorkOSConfigured(): boolean {
  const apiKey = process.env.WORKOS_API_KEY
  const clientId = process.env.WORKOS_CLIENT_ID
  const redirectUri =
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? process.env.WORKOS_REDIRECT_URI
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD
  const hasRequired =
    Boolean(apiKey) &&
    Boolean(clientId) &&
    Boolean(redirectUri) &&
    Boolean(cookiePassword) &&
    cookiePassword.length >= 32
  const looksPlaceholder =
    apiKey === "sk_test_xxx" ||
    clientId === "client_xxx" ||
    cookiePassword === "xxx"
  return hasRequired && !looksPlaceholder
}

const workosMiddleware = authkitMiddleware({
  debug: process.env.NODE_ENV !== "production",
  eagerAuth: true,
})

/**
 * WorkOS AuthKit middleware when configured; otherwise pass-through to avoid
 * MIDDLEWARE_INVOCATION_FAILED when WORKOS_* env are missing or placeholder.
 */
export default function middleware(request: NextRequest) {
  if (!isWorkOSConfigured()) {
    return NextResponse.next()
  }
  return workosMiddleware(request)
}

export const config = {
  matcher: ["/:path*"],
}
