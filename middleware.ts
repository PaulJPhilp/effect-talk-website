import { authkitMiddleware } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"

const AUTH_CALLBACK_PATH = "/auth/callback"

const isVercelPreview = process.env.VERCEL_ENV === "preview"

/**
 * Build redirect URI for WorkOS.
 *
 * On Vercel preview deployments we always use the request origin so the user
 * stays on the preview URL after sign-in (requires the preview domain pattern
 * to be registered in the WorkOS Dashboard redirect allowlist).
 *
 * On production we prefer the env-defined APP_BASE_URL so the canonical domain
 * is always used regardless of proxy headers.
 */
function getRedirectUri(request: NextRequest): string {
  if (isVercelPreview) {
    return `${request.nextUrl.origin}${AUTH_CALLBACK_PATH}`
  }

  const base =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ??
    process.env.WORKOS_REDIRECT_URI

  if (base) {
    const url = base.replace(/\/$/, "")
    return url.includes(AUTH_CALLBACK_PATH) ? url : `${url}${AUTH_CALLBACK_PATH}`
  }

  return `${request.nextUrl.origin}${AUTH_CALLBACK_PATH}`
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
