/**
 * Typed environment variable parsing. Never throws; missing vars get fallbacks.
 * Client-safe vars must use NEXT_PUBLIC_ prefix.
 */

export type AppEnv = "local" | "staging" | "production"

/** Resolve the current application environment from APP_ENV or VERCEL_ENV. */
export function getAppEnv(): AppEnv {
  const explicit = process.env.APP_ENV
  if (explicit === "staging" || explicit === "production") return explicit
  if (explicit === "local") return "local"
  // Derive from Vercel's VERCEL_ENV when APP_ENV isn't set
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === "production") return "production"
  if (vercelEnv === "preview") return "staging"
  return "local"
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

/** Server-only env vars. Do NOT import this file in client components. Never throws for missing vars. */
export const env = {
  /** Optional: used only if an external backend API is configured; pattern/rule data comes from DB. */
  BACKEND_API_BASE_URL: optionalEnv("BACKEND_API_BASE_URL", "http://localhost:4000"),
  /** Empty when unset; db/client throws only on first use. Build never fails for missing DATABASE_URL. */
  DATABASE_URL: optionalEnv("DATABASE_URL", ""),
  WORKOS_API_KEY: optionalEnv("WORKOS_API_KEY", ""),
  WORKOS_CLIENT_ID: optionalEnv("WORKOS_CLIENT_ID", ""),
  WORKOS_REDIRECT_URI: optionalEnv("WORKOS_REDIRECT_URI", ""),
  RESEND_API_KEY: optionalEnv("RESEND_API_KEY", ""),
  API_KEY_PEPPER: optionalEnv("API_KEY_PEPPER", ""),
  APP_BASE_URL: optionalEnv("APP_BASE_URL", "http://localhost:3000"),
  APP_ENV: optionalEnv("APP_ENV", "local") as "local" | "staging" | "production",
} as const
