import { authkitMiddleware } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"

const AUTH_CALLBACK_PATH = "/auth/callback"

/**
 * Build redirect URI for WorkOS. Prefer env-defined base so production/staging
 * always send the exact URL that is allowed in WorkOS (request host can be
 * wrong behind proxies). Fall back to request host for local dev.
 */
function getRedirectUri(request: NextRequest): string {
  const base =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ??
    process.env.WORKOS_REDIRECT_URI

  if (base) {
    const url = base.replace(/\/$/, "")
    return url.includes(AUTH_CALLBACK_PATH) ? url : `${url}${AUTH_CALLBACK_PATH}`
  }

  const origin = request.nextUrl.origin
  return `${origin}${AUTH_CALLBACK_PATH}`
}

/**
 * WorkOS AuthKit middleware. On missing/invalid WORKOS_* env the SDK may throw;
 * catch and pass through so we never 500 (MIDDLEWARE_INVOCATION_FAILED).
 * Redirect URI is computed per-request from the request host so WorkOS always
 * receives a URI that matches the current site and is in the Dashboard allow list.
 */
export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  try {
    const workosMiddleware = authkitMiddleware({
      debug: process.env.NODE_ENV !== "production",
      eagerAuth: true,
      redirectUri: getRedirectUri(request),
    })
    return await workosMiddleware(request, event)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/:path*"],
}
