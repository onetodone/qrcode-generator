// Fixed-window rate limiter, process-local. The app runs as a single container
// (see docker-compose.yml), so an in-memory store is enough — state is lost on
// restart, which only widens an active abuse window by the few seconds a
// redeploy takes. If the app is ever scaled horizontally, swap the Map here for
// a shared store (Redis); the call sites don't change.

type Bucket = { count: number; resetAt: number }

const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets: Map<string, Bucket> | undefined
}

const buckets = globalForRateLimit.rateLimitBuckets ?? new Map<string, Bucket>()
globalForRateLimit.rateLimitBuckets = buckets

const SWEEP_INTERVAL_MS = 60_000
let lastSweep = 0

function sweepExpired(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now()
  sweepExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterMs: windowMs }
  }

  bucket.count += 1
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterMs: bucket.resetAt - now,
  }
}

export function tooManyAttemptsMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
  return `Too many attempts. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
}
