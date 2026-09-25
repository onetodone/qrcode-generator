const TTL_MS = 60_000
const MAX_ENTRIES = 10_000

type Entry = { leadsTo: string; expiresAt: number }

const globalForRedirectCache = globalThis as unknown as {
  redirectCache: { entries: Map<string, Entry>; generation: number } | undefined
}

const state = globalForRedirectCache.redirectCache ?? { entries: new Map<string, Entry>(), generation: 0 }
globalForRedirectCache.redirectCache = state

export function getCachedRedirect(hash: string): string | undefined {
  const entry = state.entries.get(hash)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    state.entries.delete(hash)
    return undefined
  }
  return entry.leadsTo
}

export function redirectCacheGeneration(): number {
  return state.generation
}

export function setCachedRedirect(hash: string, leadsTo: string, generation: number): void {
  if (generation !== state.generation) return
  if (state.entries.size >= MAX_ENTRIES && !state.entries.has(hash)) {
    const oldest = state.entries.keys().next().value
    if (oldest !== undefined) state.entries.delete(oldest)
  }
  state.entries.set(hash, { leadsTo, expiresAt: Date.now() + TTL_MS })
}

export function invalidateRedirect(hash: string): void {
  state.generation += 1
  state.entries.delete(hash)
}
