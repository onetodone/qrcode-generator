import { headers } from 'next/headers'

export function clientIpFromHeaders(headerList: Headers): string {
  const forwardedFor = headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) return forwardedFor

  return headerList.get('x-real-ip')?.trim() || 'unknown'
}

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

export async function getBaseUrl(): Promise<string> {
  return baseUrlFromHeaders(await headers())
}
