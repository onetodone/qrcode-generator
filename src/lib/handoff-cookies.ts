import { cookies, headers } from 'next/headers'
import type { NextResponse } from 'next/server'

const MAX_AGE_SECONDS = 60 * 60

const HANDOFF_COOKIES = {
  resetToken: { name: 'reset-token', path: '/reset-password' },
  pendingEmail: { name: 'pending-email', path: '/verify-email' },
  confirmToken: { name: 'confirm-token', path: '/confirm-email' },
} as const

/**
 * A value that one request hands to the page that shows it: a password reset
 * token for `/reset-password`, an unconfirmed email address for
 * `/verify-email`, or an email confirmation token for `/confirm-email`. It
 * travels in an httpOnly cookie scoped to that page rather than in the query
 * string, so it never appears in a page URL, where analytics, browser history
 * and the `Referer` header would pick it up.
 */
export type HandoffCookie = keyof typeof HANDOFF_COOKIES

function isHttps(headerList: Headers): boolean {
  return headerList.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https'
}

function cookieOptions(cookie: HandoffCookie, headerList: Headers) {
  return {
    path: HANDOFF_COOKIES[cookie].path,
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps(headerList),
  }
}

/** Sets a handoff cookie on a response built in the proxy or a Route Handler. */
export function setHandoffCookie(
  response: NextResponse,
  cookie: HandoffCookie,
  value: string,
  requestHeaders: Headers,
): void {
  response.cookies.set(HANDOFF_COOKIES[cookie].name, value, cookieOptions(cookie, requestHeaders))
}

/** Sets a handoff cookie from a Server Function. */
export async function storeHandoffCookie(cookie: HandoffCookie, value: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(HANDOFF_COOKIES[cookie].name, value, cookieOptions(cookie, await headers()))
}

/** The handoff cookie's value for the current request, or `undefined`. */
export async function readHandoffCookie(cookie: HandoffCookie): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(HANDOFF_COOKIES[cookie].name)?.value || undefined
}
