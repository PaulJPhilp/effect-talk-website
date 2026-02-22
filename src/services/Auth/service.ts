/**
 * Auth Effect.Service implementation.
 *
 * Wraps WorkOS AuthKit + custom HMAC-signed session cookies in Effect.
 * `getCurrentUser` tries WorkOS first, falling back to the custom cookie
 * for routes not covered by AuthKit middleware. Next.js internal errors
 * (redirect, dynamic server usage) are re-thrown so the framework handles
 * them correctly.
 *
 * @module Auth/service
 */

import { Effect, Layer } from "effect"
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
import {
  getSessionSigningSecret,
  signSessionValue,
  verifySessionValue,
} from "@/services/Auth/crypto"
import type { AuthService } from "@/services/Auth/api"

/** Read env at runtime (avoids build-time inlining so Vercel runtime env is used). */
function getEnv(key: string): string | undefined {
  return process.env[key]
}

export class Auth extends Effect.Service<AuthService>()("Auth", {
  effect: Effect.gen(function* () {
    return {
      isWorkOSConfigured: () => {
        const apiKey = getEnv("WORKOS_API_KEY")
        const clientId = getEnv("WORKOS_CLIENT_ID")
        const redirectUri = getEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI") ?? getEnv("WORKOS_REDIRECT_URI")
        const cookiePassword = getEnv("WORKOS_COOKIE_PASSWORD")
        return Boolean(
          apiKey &&
            !apiKey.includes(WORKOS_PLACEHOLDER_CHECK) &&
          clientId &&
            !clientId.includes(WORKOS_PLACEHOLDER_CHECK) &&
          redirectUri &&
            !redirectUri.includes(WORKOS_PLACEHOLDER_CHECK) &&
          cookiePassword &&
            cookiePassword.length >= 32
        )
      },

      setSessionCookie: (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const cookieStore = await cookies()
            const appEnv = (process.env.APP_ENV as AppEnvironment | undefined) ?? DEFAULT_APP_ENV
            const secret = getSessionSigningSecret()
            if (!secret) {
              if (appEnv === "production" || appEnv === "staging") {
                console.warn(
                  "Production: session cookie secret is missing or too short (min 32 chars). Set WORKOS_COOKIE_PASSWORD. Session cookie fallback will not work."
                )
              } else {
                console.warn("setSessionCookie: missing SESSION_COOKIE_SECRET (or valid WORKOS_COOKIE_PASSWORD)")
              }
              return
            }

            cookieStore.set(SESSION_COOKIE, signSessionValue(userId, secret), {
              httpOnly: true,
              secure: appEnv !== DEFAULT_APP_ENV,
              sameSite: COOKIE_SAME_SITE_LAX,
              maxAge: SESSION_MAX_AGE,
              path: COOKIE_PATH_ROOT,
            })
          },
          catch: (e) => e,
        }).pipe(Effect.catchAll(() => Effect.void)),

      clearSessionCookie: () =>
        Effect.tryPromise({
          try: async () => {
            const cookieStore = await cookies()
            cookieStore.delete(SESSION_COOKIE)
          },
          catch: (e) => e,
        }).pipe(Effect.catchAll(() => Effect.void)),

      getSessionUserId: () =>
        Effect.tryPromise({
          try: async () => {
            const cookieStore = await cookies()
            const session = cookieStore.get(SESSION_COOKIE)
            if (!session?.value) return null

            const secret = getSessionSigningSecret()
            if (!secret) return null

            const verifiedValue = verifySessionValue(session.value, secret)
            if (!verifiedValue) {
              try {
                cookieStore.delete(SESSION_COOKIE)
              } catch {
                // Ignore: cookie mutations are not allowed in all Next.js execution contexts.
              }
              return null
            }

            return verifiedValue
          },
          catch: () => null,
        }),

      getCurrentUser: () =>
        Effect.tryPromise({
          try: async (): Promise<DbUser | null> => {
            // Check WorkOS configuration first
            const apiKey = getEnv("WORKOS_API_KEY")
            const clientId = getEnv("WORKOS_CLIENT_ID")
            const redirectUri = getEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI") ?? getEnv("WORKOS_REDIRECT_URI")
            const cookiePassword = getEnv("WORKOS_COOKIE_PASSWORD")
            const isConfigured = Boolean(
              apiKey &&
                !apiKey.includes(WORKOS_PLACEHOLDER_CHECK) &&
              clientId &&
                !clientId.includes(WORKOS_PLACEHOLDER_CHECK) &&
              redirectUri &&
                !redirectUri.includes(WORKOS_PLACEHOLDER_CHECK) &&
              cookiePassword &&
                cookiePassword.length >= 32
            )

            if (!isConfigured) {
              console.warn("getCurrentUser: WorkOS not configured")
              return null
            }

            try {
              const authResult = await withAuth()
              const { user: workosUser } = authResult

              if (!workosUser) {
                console.log("[getCurrentUser] No WorkOS session found - user not logged in")
                return null
              }

              console.log("[getCurrentUser] WorkOS session found for user:", workosUser.id, workosUser.email)

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
                const cookieStore = await cookies()
                const session = cookieStore.get(SESSION_COOKIE)
                if (!session?.value) return null

                const secret = getSessionSigningSecret()
                if (!secret) return null

                const sessionValue = verifySessionValue(session.value, secret)
                if (!sessionValue) return null

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
              if (
                error &&
                typeof error === "object" &&
                "digest" in error &&
                (String(error.digest).includes("NEXT_REDIRECT") ||
                  String(error.digest).includes("DYNAMIC_SERVER_USAGE"))
              ) {
                throw error
              }

              console.error("getCurrentUser: unexpected error:", error)
              return null
            }
          },
          catch: (error) => {
            // Re-throw Next.js internal errors
            if (
              error &&
              typeof error === "object" &&
              "digest" in error &&
              (String(error.digest).includes("NEXT_REDIRECT") ||
                String(error.digest).includes("DYNAMIC_SERVER_USAGE"))
            ) {
              throw error
            }
            return error
          },
        }).pipe(
          Effect.catchAll(() => Effect.succeed(null))
        ),

      requireAuth: () =>
        Effect.tryPromise({
          try: async (): Promise<DbUser> => {
            // Inline getCurrentUser logic to propagate redirect correctly
            const apiKey = getEnv("WORKOS_API_KEY")
            const clientId = getEnv("WORKOS_CLIENT_ID")
            const redirectUri = getEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI") ?? getEnv("WORKOS_REDIRECT_URI")
            const cookiePassword = getEnv("WORKOS_COOKIE_PASSWORD")
            const isConfigured = Boolean(
              apiKey &&
                !apiKey.includes(WORKOS_PLACEHOLDER_CHECK) &&
              clientId &&
                !clientId.includes(WORKOS_PLACEHOLDER_CHECK) &&
              redirectUri &&
                !redirectUri.includes(WORKOS_PLACEHOLDER_CHECK) &&
              cookiePassword &&
                cookiePassword.length >= 32
            )

            let user: DbUser | null = null
            if (isConfigured) {
              try {
                const authResult = await withAuth()
                const { user: workosUser } = authResult

                if (workosUser) {
                  user = await Effect.runPromise(
                    getUserByWorkosId(workosUser.id).pipe(
                      Effect.catchAll(() => Effect.succeed(null))
                    )
                  )
                }
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message.includes("isn't covered by the AuthKit middleware")
                ) {
                  const cookieStore = await cookies()
                  const session = cookieStore.get(SESSION_COOKIE)
                  if (session?.value) {
                    const secret = getSessionSigningSecret()
                    if (secret) {
                      const sessionValue = verifySessionValue(session.value, secret)
                      if (sessionValue) {
                        const isWorkosId = sessionValue.startsWith("user_")
                        user = await Effect.runPromise(
                          (isWorkosId
                            ? getUserByWorkosId(sessionValue)
                            : getUserById(sessionValue)
                          ).pipe(Effect.catchAll(() => Effect.succeed(null)))
                        )
                      }
                    }
                  }
                } else if (
                  error &&
                  typeof error === "object" &&
                  "digest" in error &&
                  (String(error.digest).includes("NEXT_REDIRECT") ||
                    String(error.digest).includes("DYNAMIC_SERVER_USAGE"))
                ) {
                  throw error
                }
              }
            }

            if (!user) {
              redirect("/auth/sign-in")
            }
            return user
          },
          catch: (error) => {
            // Re-throw Next.js internal errors (redirect, dynamic server usage)
            if (
              error &&
              typeof error === "object" &&
              "digest" in error
            ) {
              throw error
            }
            return error
          },
        }).pipe(
          Effect.catchAll((): Effect.Effect<DbUser, never> => {
            redirect("/auth/sign-in")
          })
        ),
    } satisfies AuthService
  }),
}) {}

/** No-op implementation for tests. */
export const AuthNoOp = Layer.succeed(Auth, {
  isWorkOSConfigured: () => false,
  setSessionCookie: () => Effect.void,
  clearSessionCookie: () => Effect.void,
  getSessionUserId: () => Effect.succeed(null),
  getCurrentUser: () => Effect.succeed(null),
  requireAuth: () => Effect.die("AuthNoOp: requireAuth called in test"),
})
