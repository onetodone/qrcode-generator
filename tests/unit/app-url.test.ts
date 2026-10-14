import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  appUrlForPath,
  getAppHostname,
  getAppUrl,
  getConfiguredShortLinkUrl,
  getShortLinkHostname,
  getSiteUrl,
} from '@/lib/app-url'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getAppUrl', () => {
  test('drops trailing slashes and surrounding spaces', () => {
    vi.stubEnv('APP_URL', ' https://app.example/// ')
    expect(getAppUrl()).toBe('https://app.example')
  })

  test('throws when unset', () => {
    vi.stubEnv('APP_URL', '')
    expect(() => getAppUrl()).toThrow('APP_URL must be set')
  })
})

describe('getSiteUrl', () => {
  test('falls back to the Vercel URL, then to localhost on PORT', () => {
    vi.stubEnv('APP_URL', '')
    vi.stubEnv('VERCEL_URL', 'preview.vercel.app')
    expect(getSiteUrl()).toBe('https://preview.vercel.app')

    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('PORT', '4000')
    expect(getSiteUrl()).toBe('http://localhost:4000')
  })
})

describe('short-link URLs', () => {
  test('use SHORT_LINK_URL, else APP_URL, else nothing', () => {
    vi.stubEnv('APP_URL', 'https://app.example')
    vi.stubEnv('SHORT_LINK_URL', 'https://s.example/')
    expect(getConfiguredShortLinkUrl()).toBe('https://s.example')
    expect(getShortLinkHostname()).toBe('s.example')
    expect(getAppHostname()).toBe('app.example')

    vi.stubEnv('SHORT_LINK_URL', '')
    expect(getConfiguredShortLinkUrl()).toBe('https://app.example')
    expect(getShortLinkHostname()).toBeNull()

    vi.stubEnv('APP_URL', '')
    expect(getConfiguredShortLinkUrl()).toBeNull()
  })

  test('hostnames are null for an invalid URL', () => {
    vi.stubEnv('APP_URL', 'not a url')
    expect(getAppHostname()).toBeNull()
  })
})

describe('appUrlForPath', () => {
  test('keeps the path and query on the APP_URL origin', () => {
    vi.stubEnv('APP_URL', 'https://app.example')
    expect(appUrlForPath('/qrcodes', '?a=1').href).toBe('https://app.example/qrcodes?a=1')
  })

  test.each(['//evil.example/x', '///evil.example/x', '/%2F%2Fevil.example/x', '/\\evil.example/x'])(
    'never leaves the APP_URL origin for %s',
    (pathname) => {
      vi.stubEnv('APP_URL', 'https://app.example')
      const target = appUrlForPath(pathname, '')
      expect(target.origin).toBe('https://app.example')
      expect(target.pathname.startsWith('//')).toBe(false)
      expect(new URL(target.pathname, 'https://app.example').origin).toBe('https://app.example')
    },
  )
})
