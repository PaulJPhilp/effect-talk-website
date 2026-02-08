/**
 * Auth service API: WorkOS AuthKit (SDK) + session sync with our DB.
 *
 * We use @workos-inc/authkit-nextjs for the OAuth flow. The callback route uses
 * handleAuth() and in onSuccess we upsert the user to our DB and set our session
 * cookie as a cache. getCurrentUser() uses WorkOS's withAuth() as the source of
 * truth for authentication, ensuring sessions persist correctly.
 */

import { Effect } from "effect"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { withAuth } from "@workos-inc/authkit-nextjs"
import {
  WORKOS_PLACEHOLDER_CHECK,
  COOKIE_SAME_SITE_LAX,
  COOKIE_PATH_ROOT,
  DEFAULT_APP_ENV,
} from "@/types/constants"
import type { AppEnvironment } from "@/types/strings"
import { getUserById, getUserByWorkosId } from "@/services/Db/api"
import type { DbUser } from "@/services/Db/types"
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/services/Auth/helpers"

// ---------------------------------------------------------------------------
// WorkOS AuthKit (SDK) configuration check
// ---------------------------------------------------------------------------

/**
 * Check if WorkOS AuthKit SDK is properly configured (required env vars for @workos-inc/authkit-nextjs).
 */
export function isWorkOSConfigured(): boolean {
  const clientId = process.env.WORKOS_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? process.env.WORKOS_REDIRECT_URI
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD
  return Boolean(
    clientId &&
      redirectUri &&
    cookiePassword &&
      cookiePassword.length >= 32 &&
      !clientId.includes(WORKOS_PLACEHOLDER_CHECK) &&
      !redirectUri.includes(WORKOS_PLACEHOLDER_CHECK)
  )
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/**
 * Set session cookie after successful login.
 * For v1, we store the DB user ID in a signed httpOnly cookie.
 */
export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies()
  const appEnv = (process.env.APP_ENV as AppEnvironment | undefined) ?? DEFAULT_APP_ENV
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: appEnv !== DEFAULT_APP_ENV,
    sameSite: COOKIE_SAME_SITE_LAX,
    maxAge: SESSION_MAX_AGE,
    path: COOKIE_PATH_ROOT,
  })
}

/**
 * Clear session cookie (sign out).
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * Get the current user's DB ID from the session cookie.
 * Returns null if not logged in.
 */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  return session?.value ?? null
}

/**
 * Get the current logged-in user, or null.
 * Uses WorkOS AuthKit's withAuth() as the source of truth for authentication,
 * then looks up the DB user by workos_id. This ensures sessions persist correctly
 * even if the custom cookie is lost.
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  // Check WorkOS configuration first
  if (!isWorkOSConfigured()) {
    console.warn("getCurrentUser: WorkOS not configured")
    return null
  }

  try {
    // Check WorkOS session first (source of truth)
    // withAuth() returns { user: null } if no session, throws if middleware missing
    const authResult = await withAuth()
    const { user: workosUser } = authResult

    if (!workosUser) {
      // No session - user not logged in
      // NOTE: If you just changed WORKOS_COOKIE_PASSWORD, you need to clear browser cookies
      // and log in again, as old cookies were encrypted with the old password
      console.log("[getCurrentUser] No WorkOS session found - user not logged in")
      return null
    }

    console.log("[getCurrentUser] WorkOS session found for user:", workosUser.id, workosUser.email)

    // Look up DB user by WorkOS user ID
    const dbUser = await Effect.runPromise(
      getUserByWorkosId(workosUser.id).pipe(
        Effect.catchAll((error) => {
          console.error("getCurrentUser: DB lookup failed for workosId:", workosUser.id, error)
          return Effect.succeed(null)
        })
      )
    )

    if (!dbUser) {
      console.warn("getCurrentUser: WorkOS user exists but DB user not found:", workosUser.id)
    }

    return dbUser
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("isn't covered by the AuthKit middleware")
    ) {
      // Middleware not running; fallback to our own session cookie
      const sessionValue = await getSessionUserId()
      if (!sessionValue) return null

      // Cookie may contain a DB UUID (new) or a WorkOS ID (old).
      // Try WorkOS ID first (starts with "user_"), then UUID.
      const isWorkosId = sessionValue.startsWith("user_")
      const dbUser = await Effect.runPromise(
        (isWorkosId
          ? getUserByWorkosId(sessionValue)
          : getUserById(sessionValue)
        ).pipe(Effect.catchAll(() => Effect.succeed(null)))
      )
      return dbUser
    }

    // Don't catch Next.js internal errors - let them propagate
    // NEXT_REDIRECT: Next.js redirect (from withAuth when ensureSignedIn: true)
    // DYNAMIC_SERVER_USAGE: Expected during build when withAuth() accesses headers
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (String(error.digest).includes("NEXT_REDIRECT") ||
        String(error.digest).includes("DYNAMIC_SERVER_USAGE"))
    ) {
      // These are Next.js internal errors - rethrow so Next.js can handle them
      throw error
    }
    
    // Only catch actual unexpected errors (config issues, etc.)
    console.error("getCurrentUser: unexpected error:", error)
    return null
  }
}

/**
 * Require authentication; redirect to sign-in if not logged in.
 */
export async function requireAuth(): Promise<DbUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/sign-in")
  }
  return user
}
