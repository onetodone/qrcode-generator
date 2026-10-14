import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { clearRateLimit, peekRateLimit, rateLimit, refundRateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'

const LIMIT = { limit: 3, windowMs: 60_000 }
let key: string
let counter = 0

beforeEach(() => {
  vi.useFakeTimers()
  key = `test:${++counter}`
})

afterEach(() => {
  vi.useRealTimers()
})

describe('rateLimit', () => {
  test('allows attempts up to the limit, then refuses until the window ends', () => {
    expect(rateLimit(key, LIMIT)).toEqual({ ok: true, remaining: 2, retryAfterMs: 60_000 })
    expect(rateLimit(key, LIMIT).ok).toBe(true)
    expect(rateLimit(key, LIMIT)).toMatchObject({ ok: true, remaining: 0 })

    vi.advanceTimersByTime(20_000)
    expect(rateLimit(key, LIMIT)).toEqual({ ok: false, remaining: 0, retryAfterMs: 40_000 })

    vi.advanceTimersByTime(40_000)
    expect(rateLimit(key, LIMIT)).toMatchObject({ ok: true, remaining: 2 })
  })

  test('counts keys separately', () => {
    for (let i = 0; i < 3; i++) rateLimit(key, LIMIT)
    expect(rateLimit(key, LIMIT).ok).toBe(false)
    expect(rateLimit(`${key}:other`, LIMIT).ok).toBe(true)
  })

  test('drops expired buckets when sweeping', () => {
    rateLimit(key, LIMIT)
    vi.advanceTimersByTime(120_000)
    rateLimit(`${key}:trigger`, LIMIT)
    expect(peekRateLimit(key)).toBe(0)
  })
})

describe('peekRateLimit', () => {
  test('reports attempts without recording one', () => {
    expect(peekRateLimit(key)).toBe(0)
    rateLimit(key, LIMIT)
    rateLimit(key, LIMIT)
    expect(peekRateLimit(key)).toBe(2)
    expect(peekRateLimit(key)).toBe(2)
    vi.advanceTimersByTime(60_000)
    expect(peekRateLimit(key)).toBe(0)
  })
})

describe('refundRateLimit', () => {
  test('takes back one attempt and never goes below zero', () => {
    rateLimit(key, LIMIT)
    rateLimit(key, LIMIT)
    refundRateLimit(key)
    expect(peekRateLimit(key)).toBe(1)
    refundRateLimit(key)
    refundRateLimit(key)
    expect(peekRateLimit(key)).toBe(0)
    refundRateLimit('test:unknown')
  })
})

describe('clearRateLimit', () => {
  test('forgets every attempt', () => {
    for (let i = 0; i < 5; i++) rateLimit(key, LIMIT)
    clearRateLimit(key)
    expect(rateLimit(key, LIMIT).ok).toBe(true)
  })
})

describe('tooManyAttemptsMessage', () => {
  test.each([
    [0, '1 minute'],
    [1, '1 minute'],
    [60_000, '1 minute'],
    [60_001, '2 minutes'],
    [15 * 60_000, '15 minutes'],
  ])('rounds %d ms up to %s', (ms, text) => {
    expect(tooManyAttemptsMessage(ms)).toBe(`Too many attempts. Please try again in about ${text}.`)
  })
})
