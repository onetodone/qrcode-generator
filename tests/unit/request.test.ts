import { describe, expect, test } from 'vitest'
import { baseUrlFromHeaders, clientIpFromHeaders, hostnameFromHeaders, isPrefetchRequest } from '@/lib/request'

describe('clientIpFromHeaders', () => {
  test('takes the rightmost X-Forwarded-For entry, which the proxy appended', () => {
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2 , 3.3.3.3' }))).toBe('3.3.3.3')
  })

  test('falls back to X-Real-IP, then to unknown', () => {
    expect(clientIpFromHeaders(new Headers({ 'x-forwarded-for': ' , ', 'x-real-ip': ' 4.4.4.4 ' }))).toBe('4.4.4.4')
    expect(clientIpFromHeaders(new Headers())).toBe('unknown')
  })
})

describe('isPrefetchRequest', () => {
  test.each<Record<string, string>>([
    { 'sec-purpose': 'prefetch' },
    { 'sec-purpose': 'prefetch;prerender' },
    { purpose: 'prefetch' },
    { 'x-purpose': 'preview' },
    { 'x-moz': 'prefetch' },
  ])('flags %j', (headers) => {
    expect(isPrefetchRequest(new Headers(headers))).toBe(true)
  })

  test('passes a normal navigation', () => {
    expect(isPrefetchRequest(new Headers({ 'sec-fetch-mode': 'navigate' }))).toBe(false)
  })
})

describe('request origin', () => {
  test('comes from the forwarded protocol and the Host header', () => {
    const headers = new Headers({ host: 'app.example:8080', 'x-forwarded-proto': 'https' })
    expect(baseUrlFromHeaders(headers)).toBe('https://app.example:8080')
    expect(hostnameFromHeaders(headers)).toBe('app.example')
  })

  test('hostname is empty for a missing or malformed Host header', () => {
    expect(hostnameFromHeaders(new Headers({ host: 'bad host' }))).toBe('')
  })
})
