import { describe, expect, test } from 'vitest'
import {
  generateUrlHash,
  hasIpAddressHost,
  hasUrlCredentials,
  isOwnRedirectLink,
  isUrlShortener,
  isValidUri,
  normalizeLeadsTo,
  qrCodeContent,
} from '@/lib/qrcode'
import { qrModules } from '@/lib/qr-matrix'

describe('isValidUri', () => {
  test.each(['https://example.com', 'http://example.com/a?b=c', 'mailto:a@example.com', 'tel:+15551234567'])(
    'accepts %s',
    (value) => {
      expect(isValidUri(value)).toBe(true)
    },
  )

  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com',
    'example.com',
    '',
  ])('rejects %s', (value) => {
    expect(isValidUri(value)).toBe(false)
  })
})

describe('normalizeLeadsTo', () => {
  test.each([
    ['https://example.com/path', 'https://example.com/path'],
    ['  https://example.com  ', 'https://example.com'],
    ['example.com', 'https://example.com'],
    ['shop.example.co.uk/item?id=1', 'https://shop.example.co.uk/item?id=1'],
    ['person@example.com', 'mailto:person@example.com'],
    ['mailto:person@example.com', 'mailto:person@example.com'],
    ['+1 (650) 253-0000', 'tel:+16502530000'],
    ['+999 123 4567', 'tel:+9991234567'],
  ])('turns %s into %s', (input, expected) => {
    expect(normalizeLeadsTo(input)).toBe(expected)
  })

  test.each(['', '   ', 'asdf', 'blah@blah', 'javascript:alert(1)', 'localhost', 'example.c0m'])(
    'rejects %j',
    (input) => {
      expect(normalizeLeadsTo(input)).toBeNull()
    },
  )
})

describe('hasUrlCredentials', () => {
  test('flags a username or password', () => {
    expect(hasUrlCredentials('https://bank.com@evil.example/')).toBe(true)
    expect(hasUrlCredentials('https://user:pass@example.com/')).toBe(true)
  })

  test('passes plain URLs and non-URLs', () => {
    expect(hasUrlCredentials('https://example.com/@user')).toBe(false)
    expect(hasUrlCredentials('mailto:a@example.com')).toBe(false)
    expect(hasUrlCredentials('not a url')).toBe(false)
  })
})

describe('hasIpAddressHost', () => {
  test.each([
    'http://192.168.0.1/',
    'https://8.8.8.8',
    'http://0x7f000001/',
    'http://2130706433/',
    'http://127.1/',
    'http://[::1]/',
    'http://1.2.3.4./',
  ])('flags %s', (value) => {
    expect(hasIpAddressHost(value)).toBe(true)
  })

  test.each(['https://example.com', 'https://1.example.com', 'tel:+15551234567', 'mailto:a@1.2.3.4'])(
    'passes %s',
    (value) => {
      expect(hasIpAddressHost(value)).toBe(false)
    },
  )
})

describe('isUrlShortener', () => {
  test.each(['https://bit.ly/abc', 'https://BIT.LY/abc', 'https://bit.ly./abc', 'https://sub.tinyurl.com/x'])(
    'flags %s',
    (value) => {
      expect(isUrlShortener(value)).toBe(true)
    },
  )

  test.each(['https://example.com', 'https://notbit.ly/abc', 'https://youtu.be/abc', 'mailto:a@bit.ly'])(
    'passes %s',
    (value) => {
      expect(isUrlShortener(value)).toBe(false)
    },
  )
})

describe('isOwnRedirectLink', () => {
  const hosts = ['app.example', 's.example']

  test('flags a tracking link on an app host', () => {
    expect(isOwnRedirectLink('https://s.example/s/abc', hosts)).toBe(true)
    expect(isOwnRedirectLink('http://app.example/s/abc?x=1', hosts)).toBe(true)
  })

  test('passes other paths and hosts', () => {
    expect(isOwnRedirectLink('https://app.example/qrcodes', hosts)).toBe(false)
    expect(isOwnRedirectLink('https://other.example/s/abc', hosts)).toBe(false)
    expect(isOwnRedirectLink('not a url', hosts)).toBe(false)
  })
})

describe('qrCodeContent', () => {
  const leadsTo = 'https://example.com/menu'

  test('is the short link of a dynamic code', () => {
    expect(qrCodeContent({ kind: 'DYNAMIC', urlHash: 'abc', leadsTo }, 'https://s.example')).toBe(
      'https://s.example/s/abc',
    )
  })

  test('is the endpoint of a direct code', () => {
    expect(qrCodeContent({ kind: 'DIRECT', urlHash: null, leadsTo }, 'https://s.example')).toBe(leadsTo)
  })
})

describe('qrModules', () => {
  test('encodes characters beyond Latin-1 as UTF-8 instead of their low byte', () => {
    // "с" (U+0441) and "A" (U+0041) share the low byte 0x41.
    expect(qrModules('https://пример.рф/с')).not.toEqual(qrModules('https://пример.рф/A'))
    expect(qrModules('https://example.com/с')).not.toEqual(qrModules('https://example.com/A'))
  })

  test('fits a 200-character endpoint', () => {
    expect(qrModules(`https://example.com/${'a'.repeat(180)}`).length).toBeLessThanOrEqual(65)
  })
})

describe('generateUrlHash', () => {
  test('is 32 lowercase alphanumerics and differs between calls', () => {
    const hash = generateUrlHash()
    expect(hash).toMatch(/^[a-z0-9]{32}$/)
    expect(generateUrlHash()).not.toBe(hash)
  })
})
