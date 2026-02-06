/**
 * Simple in-memory rate limiter by IP address.
 *
 * NOTE: In a serverless environment (Vercel), each instance has its own memory,
 * so this is not globally consistent. Acceptable for v1 abuse protection.
 * For production, consider Upstash Redis rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically (every 60s)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60_000)

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  readonly maxRequests: number
  /** Window size in milliseconds */
  readonly windowMs: number
}

export interface RateLimitResult {
  readonly allowed: boolean
  readonly remaining: number
  readonly resetAt: number
}

/**
 * Check and consume a rate limit token for the given key (typically IP).
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

/**
 * Default rate limit configs for different endpoints.
 */
export const RATE_LIMITS = {
  /** Form submissions: 5 per minute */
  form: { maxRequests: 5, windowMs: 60_000 } satisfies RateLimitConfig,
  /** API key operations: 10 per minute */
  apiKey: { maxRequests: 10, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Analytics events: 30 per minute */
  events: { maxRequests: 30, windowMs: 60_000 } satisfies RateLimitConfig,
} as const
