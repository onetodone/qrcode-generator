import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getCachedRedirect, invalidateRedirect, redirectCacheGeneration, setCachedRedirect } from '@/lib/redirect-cache'

const target = { leadsTo: 'https://example.com', disabled: false }
let hash: string
let counter = 0

beforeEach(() => {
  vi.useFakeTimers()
  hash = `hash-${++counter}`
})

afterEach(() => {
  vi.useRealTimers()
})

describe('redirect cache', () => {
  test('keeps an entry for 60 seconds', () => {
    setCachedRedirect(hash, target, redirectCacheGeneration())
    expect(getCachedRedirect(hash)).toEqual(target)

    vi.advanceTimersByTime(59_999)
    expect(getCachedRedirect(hash)).toEqual(target)
    vi.advanceTimersByTime(1)
    expect(getCachedRedirect(hash)).toBeUndefined()
  })

  test('invalidation drops the entry', () => {
    setCachedRedirect(hash, target, redirectCacheGeneration())
    invalidateRedirect(hash)
    expect(getCachedRedirect(hash)).toBeUndefined()
  })

  test('drops a write that raced an invalidation', () => {
    const generation = redirectCacheGeneration()
    invalidateRedirect(hash)
    setCachedRedirect(hash, { leadsTo: 'https://old.example', disabled: false }, generation)
    expect(getCachedRedirect(hash)).toBeUndefined()
  })
})
