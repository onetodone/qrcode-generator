import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { isSafeBrowsingEnabled, lookupUrl } from '@/lib/safe-browsing'
import { checkDestination, isRecheckDue, type DestinationState } from '@/lib/destination-safety'
import { safeBrowsingResponse } from '../helpers/safe-browsing'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/email', () => ({ getMailer: () => ({}) }))

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv('SAFE_BROWSING_API_KEY', 'key')
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  fetchMock.mockReset()
})

describe('lookupUrl', () => {
  test('is unknown without an API key, and sends nothing', async () => {
    vi.stubEnv('SAFE_BROWSING_API_KEY', ' ')
    expect(isSafeBrowsingEnabled()).toBe(false)
    expect(await lookupUrl('https://example.com')).toEqual({ status: 'unknown' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('sends the URL with the API key', async () => {
    fetchMock.mockResolvedValue(safeBrowsingResponse())
    await lookupUrl('https://example.com/a b')
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://safebrowsing.googleapis.com/v5/urls:search?urls=https%3A%2F%2Fexample.com%2Fa+b')
    expect(init?.headers).toEqual({ 'X-Goog-Api-Key': 'key' })
  })

  test('is safe for an empty response', async () => {
    fetchMock.mockResolvedValue(safeBrowsingResponse())
    expect(await lookupUrl('https://example.com')).toEqual({ status: 'safe' })
  })

  test('decodes the threat types of a match', async () => {
    fetchMock.mockResolvedValue(safeBrowsingResponse('https://evil.example/', [2, 1, 9]))
    expect(await lookupUrl('https://evil.example/')).toEqual({
      status: 'unsafe',
      threatTypes: ['SOCIAL_ENGINEERING', 'MALWARE', 'THREAT_TYPE_9'],
    })
  })

  test.each([
    ['an HTTP error', () => Promise.resolve(new Response('quota', { status: 429 }))],
    ['a network error', () => Promise.reject(new Error('timeout'))],
    ['a malformed body', () => Promise.resolve(new Response(new Uint8Array([0x0a, 0x50, 0x01])))],
  ])('is unknown on %s', async (_, answer) => {
    fetchMock.mockImplementation(answer)
    expect(await lookupUrl('https://example.com')).toEqual({ status: 'unknown' })
  })
})

describe('checkDestination', () => {
  test('looks up web destinations only', async () => {
    fetchMock.mockResolvedValue(safeBrowsingResponse())
    expect(await checkDestination('mailto:a@example.com')).toEqual({ status: 'unknown' })
    expect(await checkDestination('tel:+15551234567')).toEqual({ status: 'unknown' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await checkDestination('https://example.com')).toEqual({ status: 'safe' })
  })
})

describe('isRecheckDue', () => {
  const HOUR = 60 * 60_000
  const now = Date.UTC(2026, 9, 14)

  function code(overrides: Partial<DestinationState>): DestinationState {
    return {
      urlHash: 'hash',
      leadsTo: 'https://example.com',
      disabledAt: null,
      destinationSetAt: new Date(now - 30 * 24 * HOUR),
      destinationCheckedAt: new Date(now - HOUR),
      ...overrides,
    }
  }

  test('is due right away for a never checked destination', () => {
    expect(isRecheckDue(code({ destinationCheckedAt: null }), now)).toBe(true)
  })

  test('is hourly in the first week after the destination was set', () => {
    const fresh = { destinationSetAt: new Date(now - 2 * 24 * HOUR) }
    expect(isRecheckDue(code({ ...fresh, destinationCheckedAt: new Date(now - HOUR + 1) }), now)).toBe(false)
    expect(isRecheckDue(code({ ...fresh, destinationCheckedAt: new Date(now - HOUR) }), now)).toBe(true)
  })

  test('is daily after the first week', () => {
    expect(isRecheckDue(code({ destinationCheckedAt: new Date(now - 23 * HOUR) }), now)).toBe(false)
    expect(isRecheckDue(code({ destinationCheckedAt: new Date(now - 24 * HOUR) }), now)).toBe(true)
  })

  test('is never due for disabled codes, non-web destinations or without an API key', () => {
    const due = { destinationCheckedAt: null }
    expect(isRecheckDue(code({ ...due, disabledAt: new Date(now) }), now)).toBe(false)
    expect(isRecheckDue(code({ ...due, leadsTo: 'mailto:a@example.com' }), now)).toBe(false)
    vi.stubEnv('SAFE_BROWSING_API_KEY', '')
    expect(isRecheckDue(code(due), now)).toBe(false)
  })
})
