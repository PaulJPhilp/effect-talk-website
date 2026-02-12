import { Redis } from "@upstash/redis"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const rateLimitRedis = createRateLimitRedisClient()

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

function createRateLimitRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getWindowSlot(now: number, windowMs: number): number {
  return Math.floor(now / windowMs)
}

function getWindowResetAt(windowSlot: number, windowMs: number): number {
  return (windowSlot + 1) * windowMs
}

function buildRedisRateLimitKey(key: string, windowSlot: number): string {
  return `rl:${key}:${windowSlot}`
}

async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!rateLimitRedis) {
    throw new Error("Upstash Redis is not configured")
  }

  const now = Date.now()
  const windowSlot = getWindowSlot(now, config.windowMs)
  const redisKey = buildRedisRateLimitKey(key, windowSlot)
  const resetAt = getWindowResetAt(windowSlot, config.windowMs)

  const count = await rateLimitRedis.incr(redisKey)
  if (count === 1) {
    const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000))
    await rateLimitRedis.expire(redisKey, windowSeconds)
  }

  const remaining = Math.max(0, config.maxRequests - count)
  return {
    allowed: count <= config.maxRequests,
    remaining,
    resetAt,
  }
}

function checkRateLimitMemory(
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
 * Check and consume a rate limit token for the given key (typically IP/user ID).
 * Uses Upstash Redis when configured, and falls back to in-memory in local/dev.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!rateLimitRedis) {
    return checkRateLimitMemory(key, config)
  }

  try {
    return await checkRateLimitRedis(key, config)
  } catch (error) {
    console.error("Rate limit Redis error, falling back to memory:", error)
    return checkRateLimitMemory(key, config)
  }
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
