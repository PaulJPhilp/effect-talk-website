/**
 * Auth service API: WorkOS GitHub OAuth + session management.
 *
 * WorkOS handles the OAuth flow. We store a session cookie with the user ID.
 * For v1, we use a signed cookie (no JWT library needed).
 *
 * Assumption: WorkOS SSO is configured with GitHub as an OAuth provider.
 * The WorkOS SDK is not used; we call their REST API directly for simplicity.
 */

import { Effect } from "effect"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  WORKOS_AUTHORIZE_ENDPOINT,
  WORKOS_AUTHENTICATE_ENDPOINT,
  WORKOS_PLACEHOLDER_CHECK,
  HTTP_METHOD_POST,
  CONTENT_TYPE_JSON,
  AUTH_SCHEME_BEARER,
  OAUTH_GRANT_TYPE_AUTHORIZATION_CODE,
  OAUTH_RESPONSE_TYPE_CODE,
  COOKIE_SAME_SITE_LAX,
  COOKIE_PATH_ROOT,
  JSON_INDENT_SPACES,
  DEFAULT_APP_ENV,
} from "@/types/constants"
import type { AppEnvironment } from "@/types/strings"
import { upsertUser, getUserByWorkosId } from "../Db/api"
import type { DbUser } from "../Db/types"
import { AuthError } from "./errors"
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./helpers"

// ---------------------------------------------------------------------------
// WorkOS OAuth
// ---------------------------------------------------------------------------

/**
 * Check if WorkOS is properly configured.
 */
export function isWorkOSConfigured(): boolean {
  const clientId = process.env.WORKOS_CLIENT_ID
  const redirectUri = process.env.WORKOS_REDIRECT_URI
  return Boolean(
    clientId &&
      redirectUri &&
      !clientId.includes(WORKOS_PLACEHOLDER_CHECK) &&
      !redirectUri.includes(WORKOS_PLACEHOLDER_CHECK)
  )
}

/**
 * Build the WorkOS authorization URL for AuthKit.
 * AuthKit handles provider selection automatically based on configured providers.
 */
export function getAuthorizationUrl(): string {
  const clientId = process.env.WORKOS_CLIENT_ID ?? ""
  const redirectUri = process.env.WORKOS_REDIRECT_URI ?? ""

  // WorkOS AuthKit hosted flow - no provider parameter needed
  // AuthKit will show provider selection or redirect to the only configured provider
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: OAUTH_RESPONSE_TYPE_CODE,
  })

  // Use AuthKit endpoint (not SSO endpoint)
  return `${WORKOS_AUTHORIZE_ENDPOINT}?${params.toString()}`
}

/**
 * Exchange an authorization code for user profile info via WorkOS.
 */
export function exchangeCode(code: string): Effect.Effect<
  { workosId: string; email: string; name?: string; avatarUrl?: string },
  AuthError
> {
  return Effect.tryPromise({
    try: async () => {
      const apiKey = process.env.WORKOS_API_KEY ?? ""
      const clientId = process.env.WORKOS_CLIENT_ID ?? ""

      // WorkOS AuthKit uses User Management authenticate endpoint
      const res = await fetch(WORKOS_AUTHENTICATE_ENDPOINT, {
        method: HTTP_METHOD_POST,
        headers: {
          "Content-Type": CONTENT_TYPE_JSON,
          Authorization: `${AUTH_SCHEME_BEARER} ${apiKey}`,
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: apiKey,
          grant_type: OAUTH_GRANT_TYPE_AUTHORIZATION_CODE,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`WorkOS auth failed: ${res.status} ${body}`)
      }

      const data = await res.json()
      // Log WorkOS response for debugging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log("WorkOS authenticate response:", JSON.stringify(data, null, JSON_INDENT_SPACES))
      }
      
      // WorkOS User Management authenticate returns user directly
      const user = data.user ?? data

      if (!user || !user.id || !user.email) {
        throw new Error(`Invalid user data from WorkOS: ${JSON.stringify(user)}`)
      }

      // Parse name - WorkOS might have first_name, last_name, or name field
      let name: string | undefined
      if (user.first_name || user.last_name) {
        name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || undefined
      } else if (user.name) {
        name = user.name
      }

      return {
        workosId: user.id as string,
        email: user.email as string,
        name: name || user.email.split("@")[0],
        avatarUrl: user.profile_picture_url as string | undefined,
      }
    },
    catch: (error) =>
      new AuthError({
        message: error instanceof Error ? error.message : "Code exchange failed",
      }),
  })
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
 * Uses Effect internally but resolves to a plain Promise for convenience in RSCs.
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  const userId = await getSessionUserId()
  if (!userId) return null

  // userId is actually the workos_id stored after login
  // We store workos_id in cookie for lookup
  try {
    const user = await Effect.runPromise(
      getUserByWorkosId(userId).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      )
    )
    return user
  } catch {
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

/**
 * Handle the OAuth callback: exchange code, upsert user, set session.
 */
export function handleCallback(code: string): Effect.Effect<DbUser, AuthError> {
  return Effect.gen(function* () {
    const profile = yield* exchangeCode(code)
    const user = yield* upsertUser({
      workosId: profile.workosId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    }).pipe(
      Effect.mapError((e) => new AuthError({ message: e.message }))
    )
    // Set session cookie (stores workos_id for lookup)
    yield* Effect.promise(() => setSessionCookie(user.workos_id))
    return user
  })
}
