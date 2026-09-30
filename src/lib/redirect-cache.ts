const TTL_MS = 60_000
const MAX_ENTRIES = 10_000

/** What `/s/<hash>` needs to answer a scan: the destination and whether the code is disabled. */
export type CachedRedirect = { leadsTo: string; disabled: boolean }

type Entry = CachedRedirect & { expiresAt: number }

const globalForRedirectCache = globalThis as unknown as {
  redirectCache: { entries: Map<string, Entry>; generation: number } | undefined
}

const state = globalForRedirectCache.redirectCache ?? { entries: new Map<string, Entry>(), generation: 0 }
globalForRedirectCache.redirectCache = state

/** Cached redirect for a hash, unless missing or expired. */
export function getCachedRedirect(hash: string): CachedRedirect | undefined {
  const entry = state.entries.get(hash)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    state.entries.delete(hash)
    return undefined
  }
  return { leadsTo: entry.leadsTo, disabled: entry.disabled }
}

/** Take before reading a destination from the database and pass to `setCachedRedirect`. */
export function redirectCacheGeneration(): number {
  return state.generation
}

/**
 * Caches a redirect for 60 s. The write is dropped if any invalidation
 * happened since `generation` was taken, so a lookup racing an edit can't
 * cache the old destination.
 */
export function setCachedRedirect(hash: string, redirect: CachedRedirect, generation: number): void {
  if (generation !== state.generation) return
  if (state.entries.size >= MAX_ENTRIES && !state.entries.has(hash)) {
    const oldest = state.entries.keys().next().value
    if (oldest !== undefined) state.entries.delete(oldest)
  }
  state.entries.set(hash, { ...redirect, expiresAt: Date.now() + TTL_MS })
}

/**
 * Drops a hash from this instance's cache. Other instances keep serving their
 * copy until it expires.
 */
export function invalidateRedirect(hash: string): void {
  state.generation += 1
  state.entries.delete(hash)
}
