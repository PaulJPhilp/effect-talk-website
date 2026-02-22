/**
 * Auth service API.
 * Interface + backward-compatible convenience functions.
 *
 * WorkOS AuthKit (SDK) + session sync with our DB.
 * getCurrentUser() uses WorkOS's withAuth() as the source of truth,
 * with fallback to our custom signed session cookie.
 */

import { Effect } from "effect"
import type { DbUser } from "@/services/Db/types"
import { Auth } from "@/services/Auth/service"

/**
 * Service interface for authentication and session management.
 *
 * Two auth strategies are supported:
 * 1. **WorkOS AuthKit** — primary (SDK-managed session cookie)
 * 2. **Custom HMAC-signed cookie** — fallback for routes outside AuthKit middleware
 */
export interface AuthService {
  /** Check whether WorkOS environment variables are fully configured. */
  readonly isWorkOSConfigured: () => boolean
  /** Set the custom HMAC-signed session cookie after login. */
  readonly setSessionCookie: (userId: string) => Effect.Effect<void, unknown>
  /** Delete the session cookie (sign out). */
  readonly clearSessionCookie: () => Effect.Effect<void, unknown>
  /** Read and verify the session cookie, returning the user's DB ID or null. */
  readonly getSessionUserId: () => Effect.Effect<string | null, unknown>
  /** Get the current logged-in user, or null if unauthenticated. */
  readonly getCurrentUser: () => Effect.Effect<DbUser | null, unknown>
  /** Require authentication — redirects to `/auth/sign-in` if not logged in. */
  readonly requireAuth: () => Effect.Effect<DbUser, unknown>
}

/**
 * Check if WorkOS AuthKit SDK is properly configured.
 */
export function isWorkOSConfigured(): boolean {
  return Effect.runSync(
    Effect.gen(function* () {
      const svc = yield* Auth
      return svc.isWorkOSConfigured()
    }).pipe(Effect.provide(Auth.Default))
  )
}

/**
 * Set session cookie after successful login.
 */
export async function setSessionCookie(userId: string): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* Auth
      return yield* svc.setSessionCookie(userId)
    }).pipe(Effect.provide(Auth.Default), Effect.catchAll(() => Effect.void))
  )
}

/**
 * Clear session cookie (sign out).
 */
export async function clearSessionCookie(): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* Auth
      return yield* svc.clearSessionCookie()
    }).pipe(Effect.provide(Auth.Default), Effect.catchAll(() => Effect.void))
  )
}

/**
 * Get the current user's DB ID from the session cookie.
 * Returns null if not logged in.
 */
export async function getSessionUserId(): Promise<string | null> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* Auth
      return yield* svc.getSessionUserId()
    }).pipe(Effect.provide(Auth.Default), Effect.catchAll(() => Effect.succeed(null)))
  )
}

/**
 * Get the current logged-in user, or null.
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* Auth
      return yield* svc.getCurrentUser()
    }).pipe(Effect.provide(Auth.Default), Effect.catchAll(() => Effect.succeed(null)))
  )
}

/**
 * Require authentication; redirect to sign-in if not logged in.
 */
export async function requireAuth(): Promise<DbUser> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* Auth
      return yield* svc.requireAuth()
    }).pipe(Effect.provide(Auth.Default))
  )
}
