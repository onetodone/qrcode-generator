import { headers } from 'next/headers'

/**
 * Client IP from the rightmost `X-Forwarded-For` entry, the one appended by
 * the trusted proxy (entries to its left are client-controlled), falling back
 * to `X-Real-IP` and then `'unknown'`.
 */
export function clientIpFromHeaders(headerList: Headers): string {
  const hops = headerList
    .get('x-forwarded-for')
    ?.split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)
  const rightmost = hops?.at(-1)
  if (rightmost) return rightmost

  return headerList.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * True for speculative loads the user never asked for: Chrome's omnibox /
 * speculation-rules prefetch and prerender (`Sec-Purpose: prefetch[;prerender]`),
 * plus the legacy `Purpose` / `X-Purpose` / `X-Moz` prefetch headers. Chrome
 * discards a prerender that redirects cross-origin, so the real navigation hits
 * the server again — counting both would double every view.
 */
export function isPrefetchRequest(headerList: Headers): boolean {
  if (headerList.get('sec-purpose')?.includes('prefetch')) return true
  const legacy = headerList.get('purpose') ?? headerList.get('x-purpose') ?? headerList.get('x-moz')
  return legacy === 'prefetch' || legacy === 'preview'
}

/** `clientIpFromHeaders` for the current request. */
export async function getClientIp(): Promise<string> {
  return clientIpFromHeaders(await headers())
}

/**
 * Origin (`proto://host`) of the incoming request. Derived from the request
 * rather than a static env var, so `/s/…` links are correct whether the app is
 * hit directly or behind a reverse proxy on a public domain.
 */
export function baseUrlFromHeaders(headerList: Headers): string {
  const proto = headerList.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${headerList.get('host')}`
}

/** `baseUrlFromHeaders` for the current request. */
export async function getBaseUrl(): Promise<string> {
  return baseUrlFromHeaders(await headers())
}
