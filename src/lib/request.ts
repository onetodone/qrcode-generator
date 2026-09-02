import { headers } from 'next/headers'

export function clientIpFromHeaders(headerList: Headers): string {
  const forwardedFor = headerList.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) return forwardedFor

  return headerList.get('x-real-ip')?.trim() || 'unknown'
}

export async function getClientIp(): Promise<string> {
  return clientIpFromHeaders(await headers())
}
