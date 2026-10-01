// Fixed-window, in-memory limiter. Each server instance counts on its own and
// loses its state on restart, so with several instances (e.g. serverless) the
// effective limit is per instance. A shared store such as Redis would make it
// global without changing the call sites.

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

/** Outcome of one attempt: whether it is allowed, attempts left, and time until the window resets. */
export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

/** Records an attempt for `key` and reports whether it fits within `limit` per `windowMs`. */
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

/**
 * Takes back one attempt recorded by `rateLimit`. Used for attempts that turn
 * out not to count; recording first and refunding later keeps concurrent
 * requests from all passing a check made before any of them is recorded.
 */
export function refundRateLimit(key: string): void {
  const bucket = buckets.get(key)
  if (bucket && bucket.count > 0) bucket.count -= 1
}

/** Forgets every attempt recorded for `key`. */
export function clearRateLimit(key: string): void {
  buckets.delete(key)
}

/** User-facing "try again later" message, rounded up to whole minutes. */
export function tooManyAttemptsMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000))
  return `Too many attempts. Please try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`
}
